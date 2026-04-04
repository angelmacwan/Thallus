import React from 'react';
import { Globe, Users, GitBranch, MoreHorizontal, Trash2 } from 'lucide-react';

const STATUS_COLORS = {
	idle: '#6366f1',
	running: '#f59e0b',
	completed: '#16a34a',
	failed: '#dc2626',
};

export default function WorldCard({ world, onClick, onDelete }) {
	const handleDelete = (e) => {
		e.stopPropagation();
		if (
			window.confirm(
				`Delete world "${world.name}"? This removes all scenarios and cannot be undone.`,
			)
		) {
			onDelete(world.world_id);
		}
	};

	return (
		<div
			onClick={onClick}
			style={{
				cursor: 'pointer',
				padding: '1.1rem 1.2rem',
				background: 'var(--surface-container-lowest)',
				border: '1px solid var(--outline-variant)',
				borderRadius: '13px',
				display: 'flex',
				flexDirection: 'column',
				gap: '0.5rem',
				transition: 'box-shadow 0.15s, border-color 0.15s',
				position: 'relative',
			}}
			onMouseEnter={(e) => {
				e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)';
				e.currentTarget.style.borderColor = 'var(--accent-color)';
			}}
			onMouseLeave={(e) => {
				e.currentTarget.style.boxShadow = 'none';
				e.currentTarget.style.borderColor = 'var(--outline-variant)';
			}}
		>
			{/* Delete btn */}
			<button
				onClick={handleDelete}
				title="Delete world"
				style={{
					position: 'absolute',
					top: 10,
					right: 10,
					background: 'none',
					border: 'none',
					cursor: 'pointer',
					color: 'var(--text-secondary)',
					padding: 4,
					borderRadius: 6,
					display: 'flex',
					alignItems: 'center',
				}}
			>
				<Trash2 size={14} />
			</button>

			{/* Icon + name */}
			<div
				style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}
			>
				<div
					style={{
						width: 36,
						height: 36,
						borderRadius: '10px',
						background: 'var(--secondary-container)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						flexShrink: 0,
					}}
				>
					<Globe
						size={18}
						color="var(--on-secondary-container)"
					/>
				</div>
				<div>
					<div
						style={{
							fontWeight: 700,
							fontSize: '0.95rem',
							color: 'var(--text-primary)',
							paddingRight: '1.2rem',
						}}
					>
						{world.name}
					</div>
					{world.description && (
						<div
							style={{
								fontSize: '0.75rem',
								color: 'var(--text-secondary)',
								whiteSpace: 'nowrap',
								overflow: 'hidden',
								textOverflow: 'ellipsis',
								maxWidth: '220px',
							}}
						>
							{world.description}
						</div>
					)}
				</div>
			</div>

			{/* Stats */}
			<div style={{ display: 'flex', gap: '1rem', marginTop: '0.2rem' }}>
				<Stat
					icon={<Users size={12} />}
					label={world.agent_count ?? 0}
					suffix="agents"
				/>
				<Stat
					icon={<GitBranch size={12} />}
					label={world.scenario_count ?? 0}
					suffix="scenarios"
				/>
			</div>
		</div>
	);
}

function Stat({ icon, label, suffix }) {
	return (
		<div
			style={{
				display: 'flex',
				alignItems: 'center',
				gap: '0.28rem',
				fontSize: '0.75rem',
				color: 'var(--text-secondary)',
			}}
		>
			{icon}
			<span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
				{label}
			</span>
			<span>{suffix}</span>
		</div>
	);
}
