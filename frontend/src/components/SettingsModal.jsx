import React, { useEffect, useState } from 'react';
import { X, Key, Check, Trash2 } from 'lucide-react';
import api from '../api';

export default function SettingsModal({ open, onClose }) {
	const [userData, setUserData] = useState(null);
	const [version, setVersion] = useState(null);
	const [loading, setLoading] = useState(false);
	const [apiKeyInput, setApiKeyInput] = useState('');
	const [apiKeyLoading, setApiKeyLoading] = useState(false);
	const [apiKeyMsg, setApiKeyMsg] = useState(null);

	useEffect(() => {
		if (!open) return;
		setLoading(true);
		setApiKeyInput('');
		setApiKeyMsg(null);
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

	function handleSaveApiKey() {
		if (!apiKeyInput.trim()) return;
		setApiKeyLoading(true);
		setApiKeyMsg(null);
		api.put('/user/api-key', { gemini_api_key: apiKeyInput.trim() })
			.then((res) => {
				setApiKeyMsg({ type: 'success', text: res.data.message });
				setApiKeyInput('');
				return api.get('/user/me');
			})
			.then((res) => res && setUserData(res.data))
			.catch((err) => {
				const detail =
					err.response?.data?.detail || 'Failed to update API key.';
				setApiKeyMsg({ type: 'error', text: detail });
			})
			.finally(() => setApiKeyLoading(false));
	}

	function handleDeleteApiKey() {
		setApiKeyLoading(true);
		setApiKeyMsg(null);
		api.delete('/user/api-key')
			.then((res) => {
				setApiKeyMsg({ type: 'success', text: res.data.message });
				setApiKeyInput('');
				return api.get('/user/me');
			})
			.then((res) => res && setUserData(res.data))
			.catch((err) => {
				const detail =
					err.response?.data?.detail || 'Failed to remove API key.';
				setApiKeyMsg({ type: 'error', text: detail });
			})
			.finally(() => setApiKeyLoading(false));
	}

	if (!open) return null;

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

						{/* Gemini API Key section */}
						<div
							style={{
								padding: '1rem 1rem',
								borderBottom:
									'1px solid var(--outline-variant)',
							}}
						>
							<div
								style={{
									display: 'flex',
									justifyContent: 'space-between',
									alignItems: 'center',
									marginBottom: '0.5rem',
								}}
							>
								<div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
									<Key size={16} color="var(--primary)" />
									<span style={{ fontSize: '0.95rem', fontWeight: 600 }}>Gemini API Key</span>
								</div>
								{userData?.has_gemini_api_key ? (
									<span
										style={{
											fontSize: '0.75rem',
											color: '#16a34a',
											background: 'rgba(22,163,74,0.1)',
											padding: '0.2rem 0.5rem',
											borderRadius: '12px',
											display: 'inline-flex',
											alignItems: 'center',
											gap: '0.25rem',
											fontWeight: 500,
										}}
									>
										<Check size={12} /> Key Configured ({userData.masked_gemini_api_key})
									</span>
								) : (
									<span
										style={{
											fontSize: '0.75rem',
											color: '#dc2626',
											background: 'rgba(220,38,38,0.08)',
											padding: '0.2rem 0.5rem',
											borderRadius: '12px',
											fontWeight: 500,
										}}
									>
										Key Required
									</span>
								)}
							</div>
							<p
								style={{
									margin: '0 0 0.75rem 0',
									fontSize: '0.75rem',
									color: 'var(--text-secondary)',
									lineHeight: 1.4,
								}}
							>
								Bring your own Google Gemini API key to run simulations, scenarios, and report generation.
							</p>

							<div style={{ display: 'flex', gap: '0.5rem' }}>
								<input
									type="password"
									value={apiKeyInput}
									onChange={(e) => setApiKeyInput(e.target.value)}
									onKeyDown={(e) => e.key === 'Enter' && handleSaveApiKey()}
									placeholder={userData?.has_gemini_api_key ? 'Enter new key to update…' : 'AIzaSy…'}
									disabled={apiKeyLoading}
									style={{
										flex: 1,
										padding: '0.4rem 0.65rem',
										borderRadius: '6px',
										border: '1px solid var(--outline-variant)',
										background: 'var(--surface)',
										color: 'var(--text-primary)',
										fontSize: '0.75rem',
										outline: 'none',
										boxSizing: 'border-box',
									}}
								/>
								<button
									onClick={handleSaveApiKey}
									disabled={apiKeyLoading || !apiKeyInput.trim()}
									style={{
										padding: '0.4rem 0.8rem',
										borderRadius: '6px',
										border: 'none',
										background: 'var(--primary)',
										color: 'var(--on-primary)',
										fontSize: '0.75rem',
										fontWeight: 600,
										cursor: apiKeyLoading || !apiKeyInput.trim() ? 'not-allowed' : 'pointer',
										opacity: apiKeyLoading || !apiKeyInput.trim() ? 0.55 : 1,
										whiteSpace: 'nowrap',
										flexShrink: 0,
									}}
								>
									{apiKeyLoading ? '…' : userData?.has_gemini_api_key ? 'Update' : 'Save'}
								</button>
								{userData?.has_gemini_api_key && (
									<button
										onClick={handleDeleteApiKey}
										disabled={apiKeyLoading}
										title="Remove API Key"
										style={{
											padding: '0.4rem 0.6rem',
											borderRadius: '6px',
											border: '1px solid var(--outline-variant)',
											background: 'transparent',
											color: '#dc2626',
											fontSize: '0.75rem',
											cursor: apiKeyLoading ? 'not-allowed' : 'pointer',
											display: 'flex',
											alignItems: 'center',
											justifyContent: 'center',
											flexShrink: 0,
										}}
									>
										<Trash2 size={14} />
									</button>
								)}
							</div>
						</div>

						{apiKeyMsg && (
							<div
								style={{
									padding: '0.75rem 1rem',
									borderBottom: '1px solid var(--outline-variant)',
									fontSize: '0.75rem',
									lineHeight: 1.4,
									background:
										apiKeyMsg.type === 'success'
											? 'rgba(22,163,74,0.08)'
											: 'rgba(220,38,38,0.06)',
									color:
										apiKeyMsg.type === 'success'
											? '#16a34a'
											: '#dc2626',
								}}
							>
								{apiKeyMsg.text}
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
