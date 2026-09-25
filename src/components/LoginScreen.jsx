import { useState } from 'react'
import { login, signup } from '../lib/supabaseClient.js'

export default function LoginScreen({ onLoginSuccess }) {
  const [mode, setMode] = useState('login') // 'login' หรือ 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('')
    setIsLoading(true)

    try {
      if (mode === 'login') {
        const { data, error } = await login(email, password)

        if (error) {
          setMessage(`ล็อกอินไม่สำเร็จ: ${error.message}`)
        } else if (data.user) {
          setMessage('ล็อกอินสำเร็จ!')
          setTimeout(() => {
            onLoginSuccess(data.user)
          }, 1000)
        }
      } else {
        const { data, error } = await signup(email, password)

        if (error) {
          setMessage(`สมัครสมาชิกไม่สำเร็จ: ${error.message}`)
        } else if (data.user) {
          setMessage(
            `สมัครสมาชิกสำเร็จ! กรุณาตรวจสอบอีเมล ${email} เพื่อยืนยันตัวตน`
          )
          setTimeout(() => {
            onLoginSuccess(data.user)
          }, 3000)
        }
      }
    } catch (err) {
      setMessage(`เกิดข้อผิดพลาด: ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login')
    setMessage('')
  }

  return (
    <div className="login-screen">
      <div className="login-container">
        <h1>Borrow Buddy</h1>
        <h2>{mode === 'login' ? 'ล็อกอิน' : 'สมัครสมาชิก'}</h2>

        {message && <p className={`message ${message.includes('ไม่สำเร็จ') ? 'error' : 'success'}`}>{message}</p>}

        <form onSubmit={handleSubmit}>
          <label>
            อีเมล
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <label>
            รหัสผ่าน
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          <button type="submit" disabled={isLoading}>
            {isLoading ? 'กำลังดำเนินการ...' : mode === 'login' ? 'ล็อกอิน' : 'สมัคร'}
          </button>
        </form>

        <p className="toggle-mode">
          {mode === 'login' ? (
            <>
              ยังไม่มีบัญชี? <button onClick={toggleMode}>สมัครสมาชิก</button>
            </>
          ) : (
            <>
              มีบัญชีอยู่แล้ว? <button onClick={toggleMode}>ล็อกอิน</button>
            </>
          )}
        </p>

        <p className="note">
          หมายเหตุ: ระบบปิดการสมัครสมาชิกเอง ต้องขอสิทธิ์จาก admin ก่อนสมัคร
        </p>
      </div>
    </div>
  )
}
