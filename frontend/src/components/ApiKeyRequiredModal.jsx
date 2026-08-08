import React from 'react';
import { Key, Settings, X } from 'lucide-react';

export default function ApiKeyRequiredModal({ open, onClose }) {
	if (!open) return null;

	const handleOpenSettings = () => {
		onClose();
		window.dispatchEvent(new CustomEvent('open-settings'));
	};

	return (
		<div
			style={{
				position: 'fixed',
				inset: 0,
				background: 'rgba(0, 0, 0, 0.4)',
				backdropFilter: 'blur(5px)',
				WebkitBackdropFilter: 'blur(5px)',
				zIndex: 3000,
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
					maxWidth: '440px',
					padding: '1.75rem',
					borderRadius: '16px',
					boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
					background: 'var(--surface-container-high, #ffffff)',
				}}
				onClick={(e) => e.stopPropagation()}
			>
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: '0.75rem',
						marginBottom: '1rem',
					}}
				>
					<div
						style={{
							width: '42px',
							height: '42px',
							borderRadius: '12px',
							background: 'rgba(37, 99, 235, 0.1)',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							flexShrink: 0,
						}}
					>
						<Key size={22} color="var(--primary, #2563eb)" />
					</div>
					<div style={{ flex: 1 }}>
						<h3
							style={{
								margin: 0,
								fontSize: '1.1rem',
								fontWeight: 700,
								color: 'var(--text-primary)',
							}}
						>
							Gemini API Key Required
						</h3>
						<span
							style={{
								fontSize: '0.75rem',
								color: 'var(--text-secondary)',
							}}
						>
							Bring Your Own Key
						</span>
					</div>
					<button
						onClick={onClose}
						style={{
							background: 'none',
							border: 'none',
							cursor: 'pointer',
							color: 'var(--text-secondary)',
							padding: '0.25rem',
						}}
					>
						<X size={18} />
					</button>
				</div>

				<p
					style={{
						margin: '0 0 1.5rem 0',
						fontSize: '0.85rem',
						color: 'var(--text-secondary)',
						lineHeight: 1.5,
					}}
				>
					To run AI simulations, scenarios, and report generation, you need to add your Google Gemini API key to your account settings.
				</p>

				<div
					style={{
						display: 'flex',
						gap: '0.75rem',
						justifyContent: 'flex-end',
					}}
				>
					<button
						onClick={onClose}
						style={{
							padding: '0.55rem 1rem',
							borderRadius: '8px',
							border: '1px solid var(--outline-variant)',
							background: 'transparent',
							color: 'var(--text-secondary)',
							fontSize: '0.825rem',
							fontWeight: 600,
							cursor: 'pointer',
						}}
					>
						Cancel
					</button>
					<button
						onClick={handleOpenSettings}
						style={{
							padding: '0.55rem 1.15rem',
							borderRadius: '8px',
							border: 'none',
							background: 'var(--primary, #2563eb)',
							color: '#ffffff',
							fontSize: '0.825rem',
							fontWeight: 600,
							cursor: 'pointer',
							display: 'flex',
							alignItems: 'center',
							gap: '0.5rem',
							boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
						}}
					>
						<Settings size={16} />
						Add Key in Settings
					</button>
				</div>
			</div>
		</div>
	);
}
