import React, { useEffect, useState } from 'react';
import { AlertTriangle, Info, XCircle, X } from 'lucide-react';
import api from '../../api';

const LEVEL_ICON = {
	error: (
		<XCircle
			size={14}
			color="#dc2626"
		/>
	),
	warning: (
		<AlertTriangle
			size={14}
			color="#f59e0b"
		/>
	),
	info: (
		<Info
			size={14}
			color="#6366f1"
		/>
	),
};
const LEVEL_BG = { error: '#fee2e2', warning: '#fef9c3', info: '#ede9fe' };
const LEVEL_COLOR = { error: '#dc2626', warning: '#b45309', info: '#4f46e5' };

export default function WorldHealthCheck({ worldId }) {
	const [items, setItems] = useState([]);
	const [dismissed, setDismissed] = useState(false);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (!worldId) return;
		setDismissed(false);
		setLoading(true);
		api.get(`/small-world/worlds/${worldId}/health-check`)
			.then((r) => setItems(r.data))
			.catch(() => setItems([]))
			.finally(() => setLoading(false));
	}, [worldId]);

	if (loading || dismissed || items.length === 0) return null;

	return (
		<div
			style={{
				background: 'var(--surface-container-high)',
				border: '1px solid var(--outline-variant)',
				borderRadius: '10px',
				padding: '0.7rem 1rem',
				marginBottom: '0.9rem',
				position: 'relative',
			}}
		>
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					marginBottom: items.length > 0 ? '0.5rem' : 0,
				}}
			>
				<span
					style={{
						fontSize: '0.78rem',
						fontWeight: 700,
						color: 'var(--text-primary)',
					}}
				>
					World Health Check
				</span>
				<button
					onClick={() => setDismissed(true)}
					style={{
						background: 'none',
						border: 'none',
						cursor: 'pointer',
						color: 'var(--text-secondary)',
						padding: 2,
						display: 'flex',
					}}
				>
					<X size={14} />
				</button>
			</div>
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					gap: '0.3rem',
				}}
			>
				{items.map((item, i) => (
					<div
						key={i}
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: '0.5rem',
							padding: '0.3rem 0.6rem',
							background: LEVEL_BG[item.level] || '#f3f4f6',
							borderRadius: '6px',
						}}
					>
						{LEVEL_ICON[item.level] || <Info size={14} />}
						<span
							style={{
								fontSize: '0.78rem',
								color:
									LEVEL_COLOR[item.level] ||
									'var(--text-primary)',
							}}
						>
							{item.message}
						</span>
					</div>
				))}
			</div>
		</div>
	);
}
