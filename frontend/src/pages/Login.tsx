import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAegisStore, type Role } from '../store'
import { ArrowRight, Fingerprint, Lock, Cpu, Globe } from 'lucide-react'

const ROLE_TABS: { role: Role; label: string; color: string }[] = [
    { role: 'CIVILIAN', label: 'Civilian', color: 'var(--cyan-500)' },
    { role: 'RESPONDER', label: 'Responder', color: 'var(--amber-500)' },
    { role: 'GOVERNMENT', label: 'Government', color: 'var(--purple-500)' },
]

export default function Login() {
    const [selectedRole, setSelectedRole] = useState<Role>('RESPONDER')
    const [isScanning, setIsScanning] = useState(false)
    const login = useAegisStore(s => s.login)
    const isAuthenticated = useAegisStore(s => s.isAuthenticated)
    const navigate = useNavigate()

    // Redirect if already authenticated
    if (isAuthenticated) {
        navigate('/dashboard', { replace: true })
        return null
    }

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault()
        if (selectedRole === 'GOVERNMENT' && !isScanning) {
            setIsScanning(true)
            setTimeout(() => {
                login(selectedRole)
                navigate('/dashboard')
            }, 1200) // Faster scan for better UX
            return
        }
        login(selectedRole)
        navigate('/dashboard')
    }

    const accent = ROLE_TABS.find(r => r.role === selectedRole)!.color

    return (
        <div style={{
            minHeight: '100vh',
            background: 'var(--bg-void)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
        }}>
            {/* Animated Water Background */}
            <div style={{
                position: 'absolute', inset: 0,
                background: `
          radial-gradient(ellipse 80% 50% at 50% 100%, rgba(6,182,212,0.08) 0%, transparent 60%),
          radial-gradient(ellipse 60% 40% at 30% 80%, rgba(14,165,233,0.06) 0%, transparent 50%),
          radial-gradient(ellipse 70% 30% at 70% 90%, rgba(139,92,246,0.05) 0%, transparent 50%),
          var(--bg-void)
        `,
            }} />
            {/* Animated rings */}
            {[1, 2, 3].map(i => (
                <div key={i} style={{
                    position: 'absolute',
                    bottom: '-20%', left: '50%', transform: 'translateX(-50%)',
                    width: `${300 + i * 200}px`, height: `${300 + i * 200}px`,
                    borderRadius: '50%',
                    border: '1px solid rgba(6,182,212,0.06)',
                    animation: `water-ripple ${4 + i * 2}s ease-out infinite`,
                    animationDelay: `${i * 1.5}s`,
                }} />
            ))}

            {/* Scanline Overlay */}
            <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)',
                zIndex: 1,
            }} />

            {/* Login Card */}
            <div style={{
                position: 'relative', zIndex: 2,
                width: 420, maxWidth: '90vw',
                background: 'rgba(12, 20, 40, 0.85)',
                border: '1px solid var(--border-strong)',
                borderRadius: 'var(--radius-xl)',
                backdropFilter: 'blur(20px)',
                padding: '40px 36px',
                animation: 'float-up 600ms ease both',
            }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div style={{ position: 'relative', display: 'inline-block', marginBottom: 16 }}>
                        <img src="/logo.png" alt="AEGIS" style={{
                            width: 60, height: 60,
                            filter: `drop-shadow(0 0 15px ${accent}44)`,
                        }} />
                        {isScanning && (
                            <div className="scan-line-active" style={{
                                position: 'absolute', top: 0, left: 0, right: 0,
                                height: 2, background: accent,
                                boxShadow: `0 0 10px ${accent}`,
                                animation: 'scan-vertical 1.5s ease-in-out infinite',
                            }} />
                        )}
                    </div>
                    <h1 style={{
                        fontFamily: 'var(--font-display)', fontSize: 'var(--text-3xl)',
                        fontWeight: 800, color: 'var(--text-primary)',
                        letterSpacing: '0.1em', marginBottom: 4,
                    }}>AEGIS <span style={{ fontSize: '0.5em', verticalAlign: 'top', color: accent }}>1.0</span></h1>
                    <p style={{
                        fontSize: 10, color: 'var(--text-muted)',
                        letterSpacing: '0.2em', textTransform: 'uppercase',
                        fontWeight: 600,
                    }}>Industrial Crisis Command System</p>
                </div>

                {/* Role Tabs */}
                <div style={{
                    display: 'flex', gap: 4,
                    background: 'var(--bg-card)',
                    borderRadius: 'var(--radius-sm)',
                    padding: 3, marginBottom: 24,
                }}>
                    {ROLE_TABS.map(tab => (
                        <button
                            key={tab.role}
                            onClick={() => setSelectedRole(tab.role)}
                            style={{
                                flex: 1, padding: '8px 0',
                                background: selectedRole === tab.role ? tab.color : 'transparent',
                                color: selectedRole === tab.role ? 'var(--bg-void)' : 'var(--text-secondary)',
                                border: 'none', borderRadius: 'var(--radius-xs)',
                                fontSize: 12, fontWeight: 700,
                                letterSpacing: '0.08em', textTransform: 'uppercase',
                                cursor: 'pointer',
                                transition: 'var(--transition-fast)',
                                fontFamily: 'var(--font-body)',
                            }}
                        >{tab.label}</button>
                    ))}
                </div>

                {/* Form */}
                <form onSubmit={handleLogin}>
                    {selectedRole === 'GOVERNMENT' ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '24px 0',
                            border: `1px dashed ${isScanning ? accent : 'var(--border-strong)'}`,
                            borderRadius: 'var(--radius-md)',
                            marginBottom: 24,
                            background: isScanning ? `${accent}05` : 'transparent',
                            transition: 'var(--transition-base)',
                        }}>
                            <Fingerprint
                                size={48}
                                color={isScanning ? accent : 'var(--text-muted)'}
                                style={{
                                    marginBottom: 12,
                                    animation: isScanning ? 'pulse-glow 1s infinite' : 'none'
                                }}
                            />
                            <p style={{ fontSize: 11, fontWeight: 700, color: isScanning ? accent : 'var(--text-secondary)', letterSpacing: '0.1em' }}>
                                {isScanning ? 'IDENTITY VERIFICATION IN PROGRESS...' : 'BIOMETRIC SCAN REQUIRED'}
                            </p>
                        </div>
                    ) : (
                        <>
                            <div style={{ marginBottom: 16 }}>
                                <label style={{
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    fontSize: 10, fontWeight: 700,
                                    letterSpacing: '0.1em', textTransform: 'uppercase',
                                    color: 'var(--text-muted)', marginBottom: 8,
                                }}>
                                    <Cpu size={12} /> Operator ID
                                </label>
                                <input className="input" type="text" placeholder="AEGIS-2024-OX" style={{ background: 'rgba(0,0,0,0.2)' }} />
                            </div>
                            <div style={{ marginBottom: 24 }}>
                                <label style={{
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    fontSize: 10, fontWeight: 700,
                                    letterSpacing: '0.1em', textTransform: 'uppercase',
                                    color: 'var(--text-muted)', marginBottom: 8,
                                }}>
                                    <Lock size={12} /> Crisis Key
                                </label>
                                <input className="input" type="password" placeholder="••••••••" style={{ background: 'rgba(0,0,0,0.2)' }} />
                            </div>
                        </>
                    )}

                    <button
                        type="submit"
                        disabled={isScanning}
                        className="btn btn--primary btn--lg btn--full"
                        style={{
                            background: accent,
                            color: '#000',
                            fontWeight: 800,
                            boxShadow: `0 0 20px ${accent}33`,
                            opacity: isScanning ? 0.5 : 1,
                        }}
                    >
                        {isScanning ? 'INITIATING...' : 'INITIALIZE COMMAND'}
                        {selectedRole === 'GOVERNMENT' ? <Fingerprint size={18} /> : <ArrowRight size={18} />}
                    </button>
                </form>

                <div style={{ marginTop: 24, padding: '12px', borderTop: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, opacity: 0.6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, color: 'var(--text-muted)' }}>
                            <Globe size={12} /> SECURE L3
                        </div>
                        <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--text-muted)' }} />
                        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)' }}>MUMBAI-NET</div>
                    </div>
                </div>
            </div>
        </div>
    )
}
