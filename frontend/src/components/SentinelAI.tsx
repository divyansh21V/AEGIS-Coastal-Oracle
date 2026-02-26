import { useEffect, useState } from 'react';
import { useAegisStore } from '../store';
import { Brain, Zap, MessageSquare, ShieldCheck, Activity } from 'lucide-react';

export const SentinelAI: React.FC = () => {
    const { alerts, currentRisk, waterLevel } = useAegisStore();
    const [briefing, setBriefing] = useState<string>("Analyzing coastal telemetry...");
    const [isThinking, setIsThinking] = useState(false);

    useEffect(() => {
        setIsThinking(true);
        const timer = setTimeout(() => {
            generateBriefing();
            setIsThinking(false);
        }, 800);
        return () => clearTimeout(timer);
    }, [currentRisk, waterLevel, alerts.length]);

    const generateBriefing = () => {
        const criticalAlerts = alerts.filter(a => a.severity === 'CRITICAL').length;

        let txt = "";
        if (currentRisk > 80) {
            txt = "URGENT: Coastal breach imminent. YOLOv8 detecting high-velocity debris in water lanes. Recommend immediate conversion of secondary roads to one-way evacuation routes.";
        } else if (currentRisk > 50) {
            txt = "STRATEGIC ADVISORY: Moderate flooding detected in low-lying zones. Wave run-up (R₂) nearing sea-wall capacity. Deploying additional UAV assets.";
        } else {
            txt = "OPERATIONAL STATUS: Normal. Sea levels stable. Drone fleet maintaining 2Hz telemetry sync. All responders on standby.";
        }

        if (criticalAlerts > 0) {
            txt += ` Detected ${criticalAlerts} critical anomalies requiring human oversight.`;
        }
        setBriefing(txt);
    };

    const riskLevel = currentRisk > 80 ? 'CRITICAL' : currentRisk > 50 ? 'ELEVATED' : 'NOMINAL';
    const riskColor = currentRisk > 80 ? '#EF4444' : currentRisk > 50 ? '#F59E0B' : '#10B981';

    return (
        <div style={{
            background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
            border: '1px solid rgba(6, 182, 212, 0.25)',
            borderRadius: 16,
            padding: 0,
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(6, 182, 212, 0.08), 0 0 1px rgba(6, 182, 212, 0.3)',
        }}>
            {/* Header */}
            <div style={{
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                background: 'rgba(6, 182, 212, 0.05)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                        width: 40, height: 40, borderRadius: 10,
                        background: 'linear-gradient(135deg, #06B6D4 0%, #8B5CF6 100%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 4px 16px rgba(6, 182, 212, 0.35)',
                    }}>
                        <Brain size={20} color="#fff" />
                    </div>
                    <div>
                        <div style={{
                            fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 800,
                            color: '#F1F5F9', letterSpacing: '0.04em',
                        }}>SENTINEL LIAISON</div>
                        <div style={{
                            fontSize: 9, color: 'rgba(6, 182, 212, 0.7)',
                            fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
                        }}>Neural Command Interface</div>
                    </div>
                </div>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '4px 10px', borderRadius: 20,
                    background: `${riskColor}15`, border: `1px solid ${riskColor}44`,
                }}>
                    <div style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: riskColor,
                        boxShadow: `0 0 8px ${riskColor}`,
                        animation: 'indicator-pulse 2s infinite',
                    }} />
                    <span style={{
                        fontSize: 9, fontWeight: 800, color: riskColor,
                        letterSpacing: '0.08em',
                    }}>{riskLevel}</span>
                </div>
            </div>

            {/* Briefing Body */}
            <div style={{ padding: '16px 20px' }}>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    marginBottom: 10,
                }}>
                    <Activity size={12} color="#06B6D4" />
                    <span style={{
                        fontSize: 9, fontWeight: 800, color: '#06B6D4',
                        letterSpacing: '0.1em', textTransform: 'uppercase',
                    }}>LIVE INTELLIGENCE BRIEF</span>
                </div>

                <div style={{
                    position: 'relative', paddingLeft: 14,
                    borderLeft: '2px solid rgba(6, 182, 212, 0.3)',
                }}>
                    <p style={{
                        fontSize: 12, lineHeight: 1.7, color: '#CBD5E1',
                        fontWeight: 500, margin: 0,
                        opacity: isThinking ? 0.4 : 1,
                        transition: 'opacity 0.5s ease',
                    }}>
                        {briefing}
                    </p>
                </div>
            </div>

            {/* Action Buttons */}
            <div style={{
                padding: '0 20px 16px',
                display: 'flex', gap: 8,
            }}>
                <button style={{
                    flex: 1, padding: '10px 14px',
                    background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(139, 92, 246, 0.1) 100%)',
                    border: '1px solid rgba(6, 182, 212, 0.3)',
                    borderRadius: 10, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    fontSize: 10, fontWeight: 800, color: '#06B6D4',
                    letterSpacing: '0.06em',
                    transition: 'all 0.2s ease',
                }} onMouseEnter={e => (e.currentTarget.style.background = 'rgba(6, 182, 212, 0.2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(139, 92, 246, 0.1) 100%)')}>
                    <MessageSquare size={13} />
                    QUERY SENTINEL
                </button>
                <button style={{
                    padding: '10px 16px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: 10, cursor: 'pointer',
                    fontSize: 10, fontWeight: 800, color: '#EF4444',
                    letterSpacing: '0.06em',
                    transition: 'all 0.2s ease',
                }} onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)')}>
                    OVERRIDE
                </button>
            </div>

            {/* Footer Telemetry Bar */}
            <div style={{
                padding: '10px 20px',
                borderTop: '1px solid rgba(255,255,255,0.04)',
                background: 'rgba(0,0,0,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Zap size={10} color="#10B981" />
                    <span style={{
                        fontSize: 9, fontFamily: 'var(--font-mono)', color: '#10B981',
                        fontWeight: 700, letterSpacing: '0.05em',
                    }}>NPU ACTIVE</span>
                </div>
                <div style={{ display: 'flex', gap: 16 }}>
                    <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: '#64748B', fontWeight: 600 }}>
                        Inference: <span style={{ color: '#06B6D4' }}>8.4ms</span>
                    </span>
                    <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: '#64748B', fontWeight: 600 }}>
                        <ShieldCheck size={9} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />
                        AMD Ryzen AI
                    </span>
                </div>
            </div>
        </div>
    );
};
