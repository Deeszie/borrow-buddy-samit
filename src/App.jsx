import { useLayoutEffect, useState, useEffect } from 'react'
import './App.css'
import LoanForm from './components/LoanForm.jsx'
import LoanList from './components/LoanList.jsx'
import SearchBox from './components/SearchBox.jsx'
import ThemeToggle from './components/ThemeToggle.jsx'
import LoginScreen from './components/LoginScreen.jsx'
import { toIsoDate } from './lib/dateFormat.js'
import { filterLoansByFriend, markReturned, unmarkReturned } from './lib/loanRules.js'
import { getInitialTheme, saveTheme, toggleTheme } from './lib/theme.js'
import { supabase } from './lib/supabaseClient.js'

const createId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

function App() {
  // สถานะการล็อกอิน
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  // สถานะสำหรับข้อมูล Loan
  const [loans, setLoans] = useState([])
  const [warning, setWarning] = useState(null)
  const [saving, setSaving] = useState(false)
  const [fetchError, setFetchError] = useState(null)

  const [editingId, setEditingId] = useState(null)
  const [query, setQuery] = useState('')
  const [theme, setTheme] = useState(() =>
    getInitialTheme(undefined, window.matchMedia('(prefers-color-scheme: dark)').matches),
  )

  // ตั้งธีมให้ <html> ก่อนวาดหน้าจอ เพื่อไม่ให้จอกะพริบ
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  // ตรวจสอบสถานะการล็อกอินตอนแรก
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
      }
      setAuthLoading(false)
    }

    checkAuth()

    // ฟังเหตุการณ์การเปลี่ยนแปลงการล็อกอิน
    const { data: authData } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => {
      if (authData && authData.subscription) {
        authData.subscription.unsubscribe()
      }
    }
  }, [])

  // โหลด Loan จาก Supabase หลังล็อกอินสำเร็จ
  useEffect(() => {
    const loadLoansFromSupabase = async () => {
      if (!user) {
        setLoans([])
        setFetchError(null)
        return
      }

      setFetchError(null)
      const { data, error } = await supabase
        .from('loans')
        .select('*')
        .eq('owner_id', user.id)
        .order('dueDate', { ascending: true })

      if (error) {
        console.error('Error fetching loans:', error)
        setFetchError(`ไม่สามารถโหลดข้อมูลได้: ${error.message}`)
        setLoans([])
      } else if (data) {
        setLoans(data)
      }
    }

    loadLoansFromSupabase()
  }, [user])

  // ฟังก์ชันบันทึก Loan ไป Supabase ทีละรายการ
  const saveLoanToSupabase = async (loan, user) => {
    if (loan.id) {
      // Update
      const { error } = await supabase
        .from('loans')
        .update({ ...loan, owner_id: user.id })
        .eq('id', loan.id)
      return error
    } else {
      // Insert
      const { error } = await supabase
        .from('loans')
        .insert({ ...loan, owner_id: user.id })
      return error
    }
  }

  // ฟังก์ชันจัดการกับการเปลี่ยนแปลง Loan
  const changeLoans = async (nextLoans) => {
    setLoans(nextLoans)

    // บันทึกทันทีไป Supabase (แทน localStorage)
    if (user) {
      setSaving(true)

      try {
        // ลบข้อมูลเดิมของ user นี้ออกก่อน
        await supabase.from('loans').delete().eq('owner_id', user.id)

        // แล้ว insert ใหม่ทีละรายการ
        for (const loan of nextLoans) {
          await saveLoanToSupabase(loan, user)
        }

        setWarning(null)
      } catch (err) {
        console.error('Exception saving loans:', err)
        setWarning(`บันทึกข้อมูลไม่สำเร็จ: ${err.message}`)
      } finally {
        setSaving(false)
      }
    }
  }

  const handleLoginSuccess = (user) => {
    setUser(user)
    setWarning(null)
    setFetchError(null)
  }

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Logout error:', error)
    }
    setUser(null)
  }

  const handleToggleTheme = () => {
    const next = toggleTheme(theme)
    setTheme(next)
    saveTheme(next)
  }

  const today = toIsoDate(new Date())
  const editingLoan = loans.find((loan) => loan.id === editingId) ?? null
  const visibleLoans = filterLoansByFriend(loans, query)

  const handleSave = (loan) => {
    if (loan.id) {
      changeLoans(loans.map((l) => (l.id === loan.id ? loan : l)))
    } else {
      changeLoans([...loans, { ...loan, id: createId() }])
    }
    setEditingId(null)
  }

  const replaceLoan = (target, update) =>
    changeLoans(loans.map((l) => (l.id === target.id ? update(l) : l)))

  const handleMarkReturned = (loan, returnedDate) =>
    replaceLoan(loan, (l) => markReturned(l, today, returnedDate))

  const handleUnmarkReturned = (loan) => replaceLoan(loan, unmarkReturned)

  // ถ้ายังโหลด auth อยู่ แสดง loading
  if (authLoading) {
    return (
      <div className="app-loading">
        <p>กำลังตรวจสอบสถานะการล็อกอิน...</p>
      </div>
    )
  }

  // ถ้ายังไม่ล็อกอิน แสดง LoginScreen
  if (!user) {
    return (
      <LoginScreen onLoginSuccess={handleLoginSuccess} />
    )
  }

  // หน้าหลักเมื่อล็อกอินแล้ว
  return (
    <main>
      <header className="app-header">
        <h1>Borrow Buddy</h1>
        <div className="header-actions">
          <span className="user-info">👤 {user.email}</span>
          <button onClick={handleLogout} className="logout-btn">ออกจากระบบ</button>
          <ThemeToggle theme={theme} onToggle={handleToggleTheme} />
        </div>
      </header>

      {(warning || fetchError) && <p role="alert" className="warning">{warning || fetchError}</p>}
      {saving && <p className="saving-indicator">กำลังบันทึก...</p>}

      <LoanForm
        key={editingLoan?.id ?? 'new'}
        today={today}
        editingLoan={editingLoan}
        onSave={handleSave}
        onCancelEdit={() => setEditingId(null)}
      />
      <SearchBox value={query} onChange={setQuery} />
      <LoanList
        loans={visibleLoans}
        today={today}
        onMarkReturned={handleMarkReturned}
        onUnmarkReturned={handleUnmarkReturned}
        onEdit={(loan) => setEditingId(loan.id)}
      />
    </main>
  )
}

export default App
