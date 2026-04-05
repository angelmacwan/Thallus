import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
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

const AUTO_CLOSE_MS = 5000;

export default function WorldHealthCheck({ worldId }) {
	const [items, setItems] = useState([]);
	const [visible, setVisible] = useState(false);
	const timerRef = useRef(null);

	useEffect(() => {
		if (!worldId) return;
		setVisible(false);
		clearTimeout(timerRef.current);

		api.get(`/small-world/worlds/${worldId}/health-check`)
			.then((r) => {
				const data = r.data ?? [];
				if (data.length === 0) return;
				setItems(data);
				setVisible(true);

				const hasError = data.some((i) => i.level === 'error');
				if (!hasError) {
					timerRef.current = setTimeout(
						() => setVisible(false),
						AUTO_CLOSE_MS,
					);
				}
			})
			.catch(() => {});

		return () => clearTimeout(timerRef.current);
	}, [worldId]);

	if (!visible || items.length === 0) return null;

	const toast = (
		<div
			style={{
				position: 'fixed',
				bottom: '1.5rem',
				right: '1.5rem',
				zIndex: 9999,
				width: '22rem',
				background: 'var(--surface-container-high)',
				border: '1px solid var(--outline-variant)',
				borderRadius: '12px',
				padding: '0.75rem 1rem',
				boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
				display: 'flex',
				flexDirection: 'column',
				gap: '0.5rem',
			}}
		>
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
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
					onClick={() => setVisible(false)}
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

	return createPortal(toast, document.body);
}
