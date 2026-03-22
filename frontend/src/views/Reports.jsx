import React from 'react';
import { FileText } from 'lucide-react';

export default function Reports() {
	return (
		<div
			className="fade-in"
			style={{
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				minHeight: '60vh',
				gap: '1rem',
				textAlign: 'center',
			}}
		>
			<div
				style={{
					width: 64,
					height: 64,
					borderRadius: '16px',
					background: 'var(--surface-container)',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					marginBottom: '0.5rem',
				}}
			>
				<FileText
					size={28}
					color="var(--secondary)"
				/>
			</div>
			<h2>Reports</h2>
			<p
				style={{
					color: 'var(--text-secondary)',
					maxWidth: '360px',
					lineHeight: 1.7,
				}}
			>
				Generated simulation reports will appear here. Complete a
				simulation to generate your first report.
			</p>
			<span
				className="chip chip-running"
				style={{ marginTop: '0.25rem' }}
			>
				Coming soon
			</span>
		</div>
	);
}
