import React, { useEffect, useState } from 'react';
import { X, Coins, User } from 'lucide-react';
import api from '../api';

export default function SettingsModal({ open, onClose }) {
	const [userData, setUserData] = useState(null);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (!open) return;
		setLoading(true);
		api.get('/user/me')
			.then((res) => setUserData(res.data))
			.catch(() => setUserData(null))
			.finally(() => setLoading(false));
	}, [open]);

	if (!open) return null;

	const credits = userData?.display_credits ?? 0;
	const maxCredits = userData?.initial_credits ?? 100;
	const pct =
		maxCredits > 0 ? Math.min(100, (credits / maxCredits) * 100) : 0;

	const barColor = pct > 50 ? '#16a34a' : pct > 20 ? '#d97706' : '#dc2626';

	return (
		<div
			style={{
				position: 'fixed',
				inset: 0,
				background: 'rgba(0,0,0,0.35)',
				backdropFilter: 'blur(4px)',
				WebkitBackdropFilter: 'blur(4px)',
				zIndex: 2000,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				padding: '1rem',
			}}
			onClick={onClose}
		>
			<div
				className="card"
				style={{
					width: '100%',
					maxWidth: '420px',
					padding: '1.75rem',
					borderRadius: '16px',
				}}
				onClick={(e) => e.stopPropagation()}
			>
				{/* Header */}
				<div
					style={{
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'center',
						marginBottom: '1.75rem',
					}}
				>
					<h2
						style={{
							margin: 0,
							fontSize: '1.15rem',
							fontWeight: 700,
						}}
					>
						Settings
					</h2>
					<button
						onClick={onClose}
						style={{
							background: 'none',
							border: 'none',
							cursor: 'pointer',
							color: 'var(--text-secondary)',
							display: 'flex',
							padding: '0.25rem',
						}}
					>
						<X size={20} />
					</button>
				</div>

				{loading ? (
					<div
						style={{
							textAlign: 'center',
							padding: '2rem 0',
							color: 'var(--text-secondary)',
							fontSize: '0.85rem',
						}}
					>
						Loading…
					</div>
				) : (
					<>
						{/* Account section */}
						<div style={{ marginBottom: '1.5rem' }}>
							<div
								style={{
									fontSize: '0.68rem',
									fontWeight: 700,
									textTransform: 'uppercase',
									letterSpacing: '0.08em',
									color: 'var(--text-secondary)',
									marginBottom: '0.65rem',
								}}
							>
								Account
							</div>
							<div
								style={{
									display: 'flex',
									alignItems: 'center',
									gap: '0.65rem',
									padding: '0.75rem',
									borderRadius: '10px',
									background: 'var(--surface-container-high)',
								}}
							>
								<User
									size={16}
									color="var(--text-secondary)"
									style={{ flexShrink: 0 }}
								/>
								<span
									style={{
										fontSize: '0.85rem',
										fontWeight: 500,
										wordBreak: 'break-all',
									}}
								>
									{userData?.email || '—'}
								</span>
							</div>
						</div>

						{/* Credits section */}
						<div>
							<div
								style={{
									fontSize: '0.68rem',
									fontWeight: 700,
									textTransform: 'uppercase',
									letterSpacing: '0.08em',
									color: 'var(--text-secondary)',
									marginBottom: '0.65rem',
								}}
							>
								Credits
							</div>
							<div
								style={{
									padding: '1rem',
									borderRadius: '10px',
									background: 'var(--surface-container-high)',
								}}
							>
								<div
									style={{
										display: 'flex',
										alignItems: 'center',
										gap: '0.5rem',
										marginBottom: '0.85rem',
									}}
								>
									<Coins
										size={16}
										color={barColor}
										style={{ flexShrink: 0 }}
									/>
									<span
										style={{
											fontSize: '1.4rem',
											fontWeight: 700,
											color: barColor,
											lineHeight: 1,
										}}
									>
										{credits.toLocaleString()}
									</span>
									<span
										style={{
											fontSize: '0.8rem',
											color: 'var(--text-secondary)',
											marginLeft: '0.1rem',
										}}
									>
										/ {maxCredits.toLocaleString()} credits
									</span>
								</div>

								{/* Progress bar */}
								<div
									style={{
										height: '8px',
										borderRadius: '999px',
										background: 'var(--outline-variant)',
										overflow: 'hidden',
									}}
								>
									<div
										style={{
											height: '100%',
											width: `${pct}%`,
											borderRadius: '999px',
											background: barColor,
											transition: 'width 0.4s ease',
										}}
									/>
								</div>

								<div
									style={{
										marginTop: '0.6rem',
										fontSize: '0.75rem',
										color: 'var(--text-secondary)',
									}}
								>
									{credits <= 0
										? '⚠ You have no credits remaining. Contact support to top up.'
										: `${pct.toFixed(0)}% remaining`}
								</div>
							</div>

							{credits <= 0 && (
								<div
									style={{
										marginTop: '0.75rem',
										padding: '0.65rem 0.85rem',
										borderRadius: '8px',
										background: 'rgba(220,38,38,0.08)',
										border: '1px solid #dc2626',
										fontSize: '0.78rem',
										color: '#dc2626',
										lineHeight: 1.5,
									}}
								>
									Your credits are exhausted. You won't be
									able to run new simulations, scenarios, or
									insights until your balance is topped up.
								</div>
							)}
						</div>
					</>
				)}
			</div>
		</div>
	);
}
