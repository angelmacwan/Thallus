import React, { useEffect, useState } from 'react';
import { X, Coins, User, Tag } from 'lucide-react';
import api from '../api';

export default function SettingsModal({ open, onClose }) {
	const [userData, setUserData] = useState(null);
	const [version, setVersion] = useState(null);
	const [loading, setLoading] = useState(false);
	const [promoCode, setPromoCode] = useState('');
	const [promoLoading, setPromoLoading] = useState(false);
	const [promoMsg, setPromoMsg] = useState(null); // { type: 'success'|'error', text: string }

	useEffect(() => {
		if (!open) return;
		setLoading(true);
		setPromoMsg(null);
		setPromoCode('');
		Promise.all([
			api
				.get('/user/me')
				.then((res) => setUserData(res.data))
				.catch(() => setUserData(null)),
			api
				.get('/version')
				.then((res) => setVersion(res.data.version))
				.catch(() => setVersion(null)),
		]).finally(() => setLoading(false));
	}, [open]);

	function handleRedeemCode() {
		if (!promoCode.trim()) return;
		setPromoLoading(true);
		setPromoMsg(null);
		api.post('/user/redeem-code', { code: promoCode.trim() })
			.then((res) => {
				setPromoMsg({ type: 'success', text: res.data.message });
				setPromoCode('');
				// Refresh credits display
				return api.get('/user/me');
			})
			.then((res) => res && setUserData(res.data))
			.catch((err) => {
				const detail =
					err.response?.data?.detail || 'Failed to redeem code.';
				setPromoMsg({ type: 'error', text: detail });
			})
			.finally(() => setPromoLoading(false));
	}

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
					maxWidth: '500px',
					padding: 0,
					borderRadius: '16px',
					overflow: 'hidden',
				}}
				onClick={(e) => e.stopPropagation()}
			>
				{/* Header */}
				<div
					style={{
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'center',
						padding: '1rem',
						borderBottom: '1px solid var(--outline-variant)',
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
							padding: '2rem',
							color: 'var(--text-secondary)',
							fontSize: '0.85rem',
						}}
					>
						Loading…
					</div>
				) : (
					<div>
						{/* Account row */}
						<div
							style={{
								display: 'flex',
								justifyContent: 'space-between',
								alignItems: 'center',
								padding: '1rem 1rem',
								borderBottom:
									'1px solid var(--outline-variant)',
							}}
						>
							<span style={{ fontSize: '0.95rem' }}>Account</span>
							<span
								style={{
									fontSize: '0.85rem',
									color: 'var(--text-secondary)',
									maxWidth: '200px',
									textAlign: 'right',
									wordBreak: 'break-all',
								}}
							>
								{userData?.email || '—'}
							</span>
						</div>

						{/* Credits row */}
						<div
							style={{
								display: 'flex',
								justifyContent: 'space-between',
								alignItems: 'center',
								padding: '1rem 1rem',
								borderBottom:
									'1px solid var(--outline-variant)',
							}}
						>
							<span style={{ fontSize: '0.95rem' }}>Credits</span>
							<div
								style={{
									display: 'flex',
									alignItems: 'center',
									gap: '0.5rem',
								}}
							>
								<Coins
									size={16}
									color={barColor}
									style={{ flexShrink: 0 }}
								/>
								<span
									style={{
										fontSize: '0.95rem',
										fontWeight: 600,
										color: barColor,
									}}
								>
									{credits.toLocaleString()}
								</span>
							</div>
						</div>

						{/* Promo code row */}
						<div
							style={{
								display: 'flex',
								justifyContent: 'space-between',
								alignItems: 'center',
								gap: '1rem',
								padding: '1rem 1rem',
								borderBottom:
									'1px solid var(--outline-variant)',
							}}
						>
							<span
								style={{ fontSize: '0.95rem', flexShrink: 0 }}
							>
								Promo Code
							</span>
							<div
								style={{
									display: 'flex',
									gap: '0.5rem',
									minWidth: 0,
									flex: 1,
									justifyContent: 'flex-end',
								}}
							>
								<div
									style={{
										position: 'relative',
										display: 'flex',
										flex: 1,
										maxWidth: '180px',
									}}
								>
									<Tag
										size={14}
										color="var(--text-secondary)"
										style={{
											position: 'absolute',
											left: '0.65rem',
											top: '50%',
											transform: 'translateY(-50%)',
											pointerEvents: 'none',
										}}
									/>
									<input
										type="text"
										value={promoCode}
										onChange={(e) =>
											setPromoCode(e.target.value)
										}
										onKeyDown={(e) =>
											e.key === 'Enter' &&
											handleRedeemCode()
										}
										placeholder="Code…"
										disabled={promoLoading}
										style={{
											width: '100%',
											paddingLeft: '2rem',
											paddingRight: '0.5rem',
											paddingTop: '0.4rem',
											paddingBottom: '0.4rem',
											borderRadius: '6px',
											border: '1px solid var(--outline-variant)',
											background: 'var(--surface)',
											color: 'var(--text-primary)',
											fontSize: '0.75rem',
											outline: 'none',
											boxSizing: 'border-box',
										}}
									/>
								</div>
								<button
									onClick={handleRedeemCode}
									disabled={promoLoading || !promoCode.trim()}
									style={{
										padding: '0.4rem 0.8rem',
										borderRadius: '6px',
										border: 'none',
										background: 'var(--primary)',
										color: 'var(--on-primary)',
										fontSize: '0.75rem',
										fontWeight: 600,
										cursor:
											promoLoading || !promoCode.trim()
												? 'not-allowed'
												: 'pointer',
										opacity:
											promoLoading || !promoCode.trim()
												? 0.55
												: 1,
										whiteSpace: 'nowrap',
										flexShrink: 0,
									}}
								>
									{promoLoading ? '…' : 'Redeem'}
								</button>
							</div>
						</div>

						{promoMsg && (
							<div
								style={{
									padding: '0.75rem 1rem',
									borderBottom:
										'1px solid var(--outline-variant)',
									fontSize: '0.75rem',
									lineHeight: 1.4,
									background:
										promoMsg.type === 'success'
											? 'rgba(22,163,74,0.08)'
											: 'rgba(220,38,38,0.06)',
									color:
										promoMsg.type === 'success'
											? '#16a34a'
											: '#dc2626',
								}}
							>
								{promoMsg.text}
							</div>
						)}

						{/* Version row */}
						<div
							style={{
								display: 'flex',
								justifyContent: 'space-between',
								alignItems: 'center',
								padding: '1rem 1rem',
							}}
						>
							<span style={{ fontSize: '0.95rem' }}>Version</span>
							<span
								style={{
									fontSize: '0.85rem',
									color: 'var(--text-secondary)',
									fontFamily: 'monospace',
								}}
							>
								{version || '—'}
							</span>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
