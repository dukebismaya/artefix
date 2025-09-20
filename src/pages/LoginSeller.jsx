import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function LoginSeller() {
  const { login } = useAuth()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')

  function onSubmit(e) {
    e.preventDefault()
    setErr('')
    try {
      login('seller', { email, password })
      nav('/seller')
    } catch (e) {
      setErr(e.message || 'Login failed')
    }
  }

  return (
    <section className="mx-auto max-w-md px-4 sm:px-6 lg:px-8 pt-10 pb-16">
      <h2 className="text-2xl font-bold gradient-text">Seller Login</h2>
      <form onSubmit={onSubmit} className="card p-5 mt-4">
        {err && <div className="mb-3 text-sm text-rose-400">{err}</div>}
        <label className="label">Email</label>
        <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <label className="label mt-3">Password</label>
        <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button type="submit" className="btn btn-primary text-white mt-4 w-full">Login</button>
        <p className="mt-3 text-xs text-gray-400">Don't have an account? <Link to="/signup-seller" className="text-teal-300">Sign up</Link></p>
      </form>
    </section>
  )
}
