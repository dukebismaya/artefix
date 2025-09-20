import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function SignupSeller() {
  const { signup } = useAuth()
  const nav = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')

  function onSubmit(e) {
    e.preventDefault()
    setErr('')
    try {
      signup('seller', { name, email, password })
      nav('/seller')
    } catch (e) {
      setErr(e.message || 'Signup failed')
    }
  }

  return (
    <section className="mx-auto max-w-md px-4 sm:px-6 lg:px-8 pt-10 pb-16">
      <h2 className="text-2xl font-bold gradient-text">Seller Sign Up</h2>
      <form onSubmit={onSubmit} className="card p-5 mt-4">
        {err && <div className="mb-3 text-sm text-rose-400">{err}</div>}
        <label className="label">Name</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        <label className="label mt-3">Email</label>
        <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <label className="label mt-3">Password</label>
        <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button type="submit" className="btn btn-primary text-white mt-4 w-full">Create Account</button>
        <p className="mt-3 text-xs text-gray-400">Already have an account? <Link to="/login-seller" className="text-teal-300">Log in</Link></p>
      </form>
    </section>
  )
}
