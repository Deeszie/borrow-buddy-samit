import { createClient } from '@supabase/supabase-js'

// โหลดค่า environment ที่ต้องใช้
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
}

// สร้าง Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Export supabase client โดยตรงสำหรับใช้ใน App.jsx
export { supabase }

/**
 * ตรวจสอบว่ามีการตั้งค่า environment ครบหรือไม่
 */
export function isConfigured() {
  return !!(supabaseUrl && supabaseAnonKey)
}

/**
 * ฟังก์ชันอ่านข้อมูล Loan จาก Supabase ด้วย RLS
 * เจ้าของแต่ละคนเห็นเฉพาะ Loan ของตัวเอง
 * คืน { data, error }
 */
export async function getLoans() {
  if (!isConfigured()) {
    return { data: null, error: new Error('Supabase not configured') }
  }

  const { data, error } = await supabase
    .from('loans')
    .select('*')
    .order('dueDate', { ascending: true })

  return { data, error }
}

/**
 * บันทึก Loan ลง Supabase
 * เพิ่ม owner_id จาก user ที่ล็อกอินอยู่
 * คืน { data, error }
 */
export async function saveLoan(loan, user) {
  if (!isConfigured()) {
    return { data: null, error: new Error('Supabase not configured') }
  }

  const owner_id = user?.id

  // ถ้ามี id อยู่แล้วคือ update
  if (loan.id) {
    const { data, error } = await supabase
      .from('loans')
      .update({
        ...loan,
        owner_id,
      })
      .eq('id', loan.id)
      .select()
      .single()

    return { data, error }
  }

  // ถ้าไม่มี id คือ insert ใหม่
  const { data, error } = await supabase
    .from('loans')
    .insert({
      ...loan,
      owner_id,
    })
    .select()
    .single()

  return { data, error }
}

/**
 * ลบ Loan ออกจาก Supabase
 * หมายเหตุ: เวอร์ชัน 2 ยังไม่มีฟีเจอร์ลบ แต่เพิ่มไว้เผื่ออนาคต
 */
export async function deleteLoan(id) {
  if (!isConfigured()) {
    return { error: new Error('Supabase not configured') }
  }

  const { error } = await supabase.from('loans').delete().eq('id', id)

  return { error }
}

/**
 * อัปเดต returnedDate ของ Loan
 */
export async function updateLoanReturned(id, returnedDate) {
  if (!isConfigured()) {
    return { data: null, error: new Error('Supabase not configured') }
  }

  const { data, error } = await supabase
    .from('loans')
    .update({ returnedDate })
    .eq('id', id)
    .select()
    .single()

  return { data, error }
}

/**
 * ฟังก์ชันจัดการ Authentication
 */

/**
 * ล็อกอินด้วย email และ password
 */
export async function login(email, password) {
  if (!isConfigured()) {
    return { data: null, error: new Error('Supabase not configured') }
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  return { data, error }
}

/**
 * สมัครสมาชิก (signup)
 * หมายเหตุ: ปิดการสมัครสมาชิกเอง ฟังก์ชันนี้เพิ่มไว้เพื่อ admin ใช้
 */
export async function signup(email, password) {
  if (!isConfigured()) {
    return { data: null, error: new Error('Supabase not configured') }
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })

  return { data, error }
}

/**
 * ออกจากระบบ (logout)
 */
export async function logout() {
  if (!isConfigured()) {
    return { error: new Error('Supabase not configured') }
  }

  const { error } = await supabase.auth.signOut()

  return { error }
}

/**
 * รับข้อมูล user ปัจจุบันที่ล็อกอินอยู่
 */
export function getUser() {
  if (!isConfigured()) {
    return null
  }

  const { data } = supabase.auth.getUser()
  return data.user
}

/**
 * ฟังเหตุการณ์การเปลี่ยนแปลงการล็อกอิน
 * คืน subscription object ที่สามารถใช้ลบ listener ได้
 */
export function onAuthStateChange(callback) {
  if (!isConfigured()) {
    return { data: { subscription: { unsubscribe: () => {} } } }
  }

  const { data } = supabase.auth.onAuthStateChange(callback)
  return data
}
