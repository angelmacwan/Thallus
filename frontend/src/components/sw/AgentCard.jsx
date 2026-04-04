import React from 'react';
import {
	User,
	Briefcase,
	Building,
	MapPin,
	Link2,
	Edit2,
	Trash2,
} from 'lucide-react';

const BIG_FIVE_KEYS = [
	'openness',
	'conscientiousness',
	'extraversion',
	'agreeableness',
	'neuroticism',
];
const BIG_FIVE_COLORS = {
	openness: '#6366f1',
	conscientiousness: '#0ea5e9',
	extraversion: '#f59e0b',
	agreeableness: '#10b981',
	neuroticism: '#ef4444',
};

export default function AgentCard({ agent, onEdit, onDelete, onClick }) {
	const pt = agent.personality_traits || {};
	const hasBigFive = BIG_FIVE_KEYS.some((k) => pt[k] != null);

	return (
		<div
			className="card"
			onClick={onClick}
			style={{
				padding: '1rem',
				borderRadius: '12px',
				cursor: onClick ? 'pointer' : 'default',
				transition: 'box-shadow 0.15s ease, transform 0.1s ease',
				position: 'relative',
			}}
			onMouseEnter={(e) => {
				if (onClick) {
					e.currentTarget.style.boxShadow =
						'0 4px 20px rgba(18,40,60,0.12)';
					e.currentTarget.style.transform = 'translateY(-1px)';
				}
			}}
			onMouseLeave={(e) => {
				e.currentTarget.style.boxShadow = '';
				e.currentTarget.style.transform = '';
			}}
		>
			{/* Actions */}
			<div
				style={{
					position: 'absolute',
					top: '0.75rem',
					right: '0.75rem',
					display: 'flex',
					gap: '0.35rem',
				}}
			>
				{onEdit && (
					<button
						onClick={(e) => {
							e.stopPropagation();
							onEdit(agent);
						}}
						style={{
							background: 'var(--surface-container-high)',
							border: 'none',
							borderRadius: '6px',
							padding: '0.3rem',
							cursor: 'pointer',
							display: 'flex',
							alignItems: 'center',
						}}
					>
						<Edit2
							size={13}
							color="var(--text-secondary)"
						/>
					</button>
				)}
				{onDelete && (
					<button
						onClick={(e) => {
							e.stopPropagation();
							onDelete(agent);
						}}
						style={{
							background: '#fee2e2',
							border: 'none',
							borderRadius: '6px',
							padding: '0.3rem',
							cursor: 'pointer',
							display: 'flex',
							alignItems: 'center',
						}}
					>
						<Trash2
							size={13}
							color="#dc2626"
						/>
					</button>
				)}
			</div>

			{/* Avatar + Name */}
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					gap: '0.6rem',
					marginBottom: '0.6rem',
					paddingRight: '3.5rem',
				}}
			>
				<div
					style={{
						width: 36,
						height: 36,
						borderRadius: '50%',
						background: 'var(--secondary-container)',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						flexShrink: 0,
					}}
				>
					<User
						size={18}
						color="var(--on-secondary-container)"
					/>
				</div>
				<div>
					<div
						style={{
							fontWeight: 700,
							fontSize: '0.9rem',
							color: 'var(--text-primary)',
						}}
					>
						{agent.name}
					</div>
					{agent.age && (
						<div
							style={{
								fontSize: '0.73rem',
								color: 'var(--text-secondary)',
							}}
						>
							Age {agent.age}
							{agent.gender ? ` · ${agent.gender}` : ''}
						</div>
					)}
				</div>
			</div>

			{/* Meta */}
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					gap: '0.3rem',
					marginBottom: '0.75rem',
				}}
			>
				{agent.job_title && (
					<div
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: '0.35rem',
							fontSize: '0.78rem',
							color: 'var(--text-secondary)',
						}}
					>
						<Briefcase
							size={12}
							color="var(--text-secondary)"
						/>
						{agent.job_title}
					</div>
				)}
				{agent.organization && (
					<div
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: '0.35rem',
							fontSize: '0.78rem',
							color: 'var(--text-secondary)',
						}}
					>
						<Building
							size={12}
							color="var(--text-secondary)"
						/>
						{agent.organization}
					</div>
				)}
				{agent.location && (
					<div
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: '0.35rem',
							fontSize: '0.78rem',
							color: 'var(--text-secondary)',
						}}
					>
						<MapPin
							size={12}
							color="var(--text-secondary)"
						/>
						{agent.location}
					</div>
				)}
			</div>

			{/* Big Five mini-bars */}
			{hasBigFive && (
				<div
					style={{
						display: 'flex',
						flexDirection: 'column',
						gap: '0.22rem',
					}}
				>
					{BIG_FIVE_KEYS.filter((k) => pt[k] != null).map((k) => (
						<div
							key={k}
							style={{
								display: 'flex',
								alignItems: 'center',
								gap: '0.4rem',
							}}
						>
							<span
								style={{
									fontSize: '0.62rem',
									color: 'var(--text-secondary)',
									textTransform: 'capitalize',
									width: 88,
									flexShrink: 0,
								}}
							>
								{k}
							</span>
							<div
								style={{
									flex: 1,
									height: 4,
									background: 'var(--surface-container-high)',
									borderRadius: 2,
									overflow: 'hidden',
								}}
							>
								<div
									style={{
										width: `${(pt[k] * 100).toFixed(0)}%`,
										height: '100%',
										background: BIG_FIVE_COLORS[k],
										borderRadius: 2,
									}}
								/>
							</div>
							<span
								style={{
									fontSize: '0.62rem',
									color: 'var(--text-secondary)',
									width: 25,
									textAlign: 'right',
								}}
							>
								{(pt[k] * 100).toFixed(0)}%
							</span>
						</div>
					))}
				</div>
			)}

			{/* Relationship count */}
			{(agent.relationship_count ?? 0) > 0 && (
				<div
					style={{
						marginTop: '0.6rem',
						display: 'flex',
						alignItems: 'center',
						gap: '0.3rem',
					}}
				>
					<Link2
						size={11}
						color="var(--text-secondary)"
					/>
					<span
						style={{
							fontSize: '0.72rem',
							color: 'var(--text-secondary)',
						}}
					>
						{agent.relationship_count} relationship
						{agent.relationship_count !== 1 ? 's' : ''}
					</span>
				</div>
			)}
		</div>
	);
}
