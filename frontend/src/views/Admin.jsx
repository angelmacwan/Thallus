import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../api';
import {
	Users,
	AlertTriangle,
	Trash2,
	Pencil,
	Check,
	X,
	RefreshCw,
	Coins,
	ChevronDown,
	ChevronRight,
	ListPlus,
	UserCheck,
	ShieldCheck,
	Plus,
	Tag,
	Database,
	Activity,
	MailPlus,
	Sparkles,
	TrendingUp,
	Clock3,
	ShieldAlert,
	ArrowUpRight,
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────

function Badge({
	children,
	color = 'var(--text-secondary)',
	tone = 'neutral',
}) {
	return (
		<span
			className={`admin-badge admin-badge-${tone}`}
			style={{
				color,
			}}
		>
			{children}
		</span>
	);
}

function Spinner() {
	return (
		<div
			style={{
				display: 'flex',
				justifyContent: 'center',
				padding: '2rem',
			}}
		>
			<RefreshCw
				size={20}
				className="spin"
				style={{ color: 'var(--accent-color)' }}
			/>
		</div>
	);
}

function ConfirmModal({
	open,
	icon: Icon,
	iconColor,
	title,
	message,
	confirmLabel,
	confirmColor,
	onConfirm,
	onCancel,
}) {
	if (!open) return null;
	return (
		<div
			className="admin-modal-backdrop"
			style={{
				zIndex: 3000,
			}}
			onClick={onCancel}
		>
			<div
				className="card admin-modal"
				style={{ maxWidth: 420, width: '90%' }}
				onClick={(e) => e.stopPropagation()}
			>
				<div className="admin-modal-header">
					<Icon
						size={18}
						color={iconColor}
					/>
					<h3 style={{ margin: 0, fontSize: '1rem' }}>{title}</h3>
				</div>
				<p className="admin-modal-copy">{message}</p>
				<div className="admin-modal-actions">
					<button
						className="btn-secondary"
						onClick={onCancel}
						style={{ fontSize: '0.85rem', padding: '0.65rem 1rem' }}
					>
						Cancel
					</button>
					<button
						className="admin-danger-button"
						onClick={onConfirm}
						style={{
							fontSize: '0.85rem',
							background: confirmColor,
						}}
					>
						{confirmLabel}
					</button>
				</div>
			</div>
		</div>
	);
}

function formatCurrency(value) {
	if (typeof value !== 'number' || Number.isNaN(value)) return '—';
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		maximumFractionDigits: value >= 100 ? 0 : 2,
	}).format(value);
}

function formatNumber(value) {
	if (typeof value !== 'number' || Number.isNaN(value)) return '—';
	return new Intl.NumberFormat('en-US').format(value);
}

function formatDateTime(value) {
	if (!value) return '—';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;
	return new Intl.DateTimeFormat('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
	}).format(date);
}

function getLatestDate(rows, field) {
	const timestamps = rows
		.map((row) => new Date(row[field]).getTime())
		.filter((value) => !Number.isNaN(value));

	if (timestamps.length === 0) return null;
	return new Date(Math.max(...timestamps));
}

function MetricCard({ icon: Icon, label, value, detail, tone = 'navy' }) {
	return (
		<div className={`admin-metric-card admin-tone-${tone}`}>
			<div className="admin-metric-icon-wrap">
				<Icon size={18} />
			</div>
			<div>
				<p className="admin-eyebrow">{label}</p>
				<p className="admin-metric-value">{value}</p>
				{detail && <p className="admin-metric-detail">{detail}</p>}
			</div>
		</div>
	);
}

function InsightCard({ title, value, detail, icon: Icon, tone = 'gold' }) {
	return (
		<div className={`admin-insight-card admin-tone-${tone}`}>
			<div className="admin-insight-header">
				<p className="admin-eyebrow">{title}</p>
				<Icon size={16} />
			</div>
			<p className="admin-insight-value">{value}</p>
			<p className="admin-insight-detail">{detail}</p>
		</div>
	);
}

// ── Section wrapper ────────────────────────────────────────────────────────────

function Section({ icon: Icon, title, subtitle, count, children }) {
	const [open, setOpen] = useState(true);
	return (
		<div className="card admin-section-card">
			<button
				className="admin-section-toggle"
				onClick={() => setOpen((o) => !o)}
			>
				<div className="admin-section-heading">
					<div className="admin-section-icon">
						<Icon
							size={16}
							color="var(--accent-color)"
						/>
					</div>
					<div>
						<p className="admin-section-title">{title}</p>
						{subtitle && (
							<p className="admin-section-subtitle">{subtitle}</p>
						)}
					</div>
				</div>
				<div className="admin-section-meta">
					{count !== undefined && (
						<Badge>
							{count} row{count !== 1 ? 's' : ''}
						</Badge>
					)}
					{open ? (
						<ChevronDown size={15} />
					) : (
						<ChevronRight size={15} />
					)}
				</div>
			</button>
			{open && <div className="admin-section-body">{children}</div>}
		</div>
	);
}

// ── Generic table ──────────────────────────────────────────────────────────────

function AdminTable({
	columns,
	rows,
	onDelete,
	onSave,
	editableFields,
	customActions,
	addRow,
}) {
	const [editingId, setEditingId] = useState(null);
	const [editValues, setEditValues] = useState({});
	const [deleteTarget, setDeleteTarget] = useState(null);
	const [confirmAction, setConfirmAction] = useState(null); // { row, action }
	const [addValues, setAddValues] = useState(() =>
		Object.fromEntries(
			(addRow?.fields || []).map((f) => [f.key, f.default ?? '']),
		),
	);
	const [adding, setAdding] = useState(false);

	const handleAdd = async () => {
		setAdding(true);
		try {
			await addRow.onAdd(addValues);
			setAddValues(
				Object.fromEntries(
					(addRow?.fields || []).map((f) => [f.key, f.default ?? '']),
				),
			);
		} finally {
			setAdding(false);
		}
	};

	const startEdit = (row) => {
		setEditingId(row.id);
		const vals = {};
		(editableFields || []).forEach((f) => {
			vals[f] = row[f];
		});
		setEditValues(vals);
	};

	const cancelEdit = () => {
		setEditingId(null);
		setEditValues({});
	};

	const handleSave = async (row) => {
		await onSave(row.id, editValues);
		setEditingId(null);
		setEditValues({});
	};

	const handleDelete = async () => {
		await onDelete(deleteTarget.id);
		setDeleteTarget(null);
	};

	const handleConfirmAction = async () => {
		if (!confirmAction) return;
		await confirmAction.action.onClick(confirmAction.row);
		setConfirmAction(null);
	};

	if (!rows || rows.length === 0) {
		return (
			<p
				style={{
					padding: '1rem 1.25rem',
					fontSize: '0.85rem',
					color: 'var(--text-secondary)',
				}}
			>
				No records found.
			</p>
		);
	}

	return (
		<>
			{addRow && (
				<div className="admin-add-row">
					{addRow.fields.map((f) => (
						<input
							className="admin-input"
							key={f.key}
							placeholder={f.label}
							type={f.type || 'text'}
							value={addValues[f.key] ?? ''}
							onChange={(e) =>
								setAddValues((v) => ({
									...v,
									[f.key]:
										f.type === 'number'
											? e.target.value === ''
												? ''
												: Number(e.target.value)
											: e.target.value,
								}))
							}
							style={{ minWidth: f.width || 120 }}
						/>
					))}
					<button
						className="admin-add-button"
						onClick={handleAdd}
						disabled={adding}
					>
						<Plus size={12} /> {addRow.label || 'Add'}
					</button>
				</div>
			)}
			<ConfirmModal
				open={!!deleteTarget}
				icon={AlertTriangle}
				iconColor="#dc2626"
				title="Confirm Delete"
				message={
					deleteTarget
						? `${deleteTarget.label} This action cannot be undone.`
						: ''
				}
				confirmLabel="Delete"
				confirmColor="#dc2626"
				onConfirm={handleDelete}
				onCancel={() => setDeleteTarget(null)}
			/>
			<ConfirmModal
				open={!!confirmAction}
				icon={confirmAction?.action.icon || UserCheck}
				iconColor={confirmAction?.action.color || 'var(--accent-color)'}
				title={confirmAction?.action.confirmTitle || 'Confirm Action'}
				message={
					confirmAction
						? (confirmAction.action.confirmMessage?.(
								confirmAction.row,
							) ?? confirmAction.action.label)
						: ''
				}
				confirmLabel={confirmAction?.action.confirmLabel || 'Confirm'}
				confirmColor={
					confirmAction?.action.color || 'var(--accent-color)'
				}
				onConfirm={handleConfirmAction}
				onCancel={() => setConfirmAction(null)}
			/>
			<div className="admin-table-wrap">
				<table className="admin-table">
					<thead>
						<tr>
							{columns.map((col) => (
								<th
									key={col.key}
									className="admin-table-head"
								>
									{col.label}
								</th>
							))}
							<th className="admin-table-head admin-table-actions-head" />
						</tr>
					</thead>
					<tbody>
						{rows.map((row) => {
							const isEditing = editingId === row.id;
							return (
								<tr
									key={row.id}
									className={
										isEditing ? 'admin-row-editing' : ''
									}
								>
									{columns.map((col) => {
										const isEditable =
											editableFields?.includes(col.key);
										return (
											<td
												key={col.key}
												className="admin-table-cell"
											>
												{isEditing && isEditable ? (
													<input
														className="admin-input"
														value={
															editValues[
																col.key
															] ?? ''
														}
														onChange={(e) =>
															setEditValues(
																(v) => ({
																	...v,
																	[col.key]:
																		col.type ===
																		'number'
																			? parseFloat(
																					e
																						.target
																						.value,
																				)
																			: e
																					.target
																					.value,
																}),
															)
														}
														type={
															col.type || 'text'
														}
														step={
															col.type ===
															'number'
																? '0.000001'
																: undefined
														}
														style={{
															width: '100%',
															minWidth: 80,
														}}
													/>
												) : col.render ? (
													col.render(
														row[col.key],
														row,
													)
												) : (
													<span
														style={{
															color:
																row[col.key] ==
																null
																	? 'var(--text-secondary)'
																	: undefined,
														}}
													>
														{row[col.key] != null
															? String(
																	row[
																		col.key
																	],
																)
															: '—'}
													</span>
												)}
											</td>
										);
									})}
									<td className="admin-table-cell admin-table-actions">
										<div className="admin-action-group">
											{isEditing ? (
												<>
													<button
														onClick={() =>
															handleSave(row)
														}
														title="Save"
														style={iconBtnStyle(
															'#16a34a',
														)}
													>
														<Check size={13} />
													</button>
													<button
														onClick={cancelEdit}
														title="Cancel"
														style={iconBtnStyle(
															'#6b7280',
														)}
													>
														<X size={13} />
													</button>
												</>
											) : (
												<>
													{editableFields &&
														editableFields.length >
															0 &&
														onSave && (
															<button
																onClick={() =>
																	startEdit(
																		row,
																	)
																}
																title="Edit"
																style={iconBtnStyle(
																	'var(--accent-color)',
																)}
															>
																<Pencil
																	size={13}
																/>
															</button>
														)}
													{customActions?.map(
														(action, idx) => (
															<button
																key={idx}
																onClick={() =>
																	action.confirm
																		? setConfirmAction(
																				{
																					row,
																					action,
																				},
																			)
																		: action.onClick(
																				row,
																			)
																}
																title={
																	action.label
																}
																style={iconBtnStyle(
																	action.color ||
																		'var(--accent-color)',
																)}
															>
																<action.icon
																	size={13}
																/>
															</button>
														),
													)}
													{onDelete && (
														<button
															onClick={() =>
																setDeleteTarget(
																	{
																		id: row.id,
																		label: `Delete record #${row.id}?`,
																	},
																)
															}
															title="Delete"
															style={iconBtnStyle(
																'#dc2626',
															)}
														>
															<Trash2 size={13} />
														</button>
													)}
												</>
											)}
										</div>
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		</>
	);
}

const iconBtnStyle = (color) => ({
	background: 'rgba(255, 255, 255, 0.8)',
	border: '1px solid rgba(18, 40, 60, 0.12)',
	borderRadius: '10px',
	padding: '0.4rem 0.5rem',
	cursor: 'pointer',
	color,
	display: 'flex',
	alignItems: 'center',
	justifyContent: 'center',
});

// ── Main Admin View ────────────────────────────────────────────────────────────

export default function Admin() {
	const navigate = useNavigate();
	const [loading, setLoading] = useState(true);
	const [authorized, setAuthorized] = useState(false);
	const [users, setUsers] = useState([]);
	const [allowedEmails, setAllowedEmails] = useState([]);
	const [waitlistEntries, setWaitlistEntries] = useState([]);
	const [attempts, setAttempts] = useState([]);
	const [promoCodeUsages, setPromoCodeUsages] = useState([]);
	const [promoCodes, setPromoCodes] = useState([]);

	const loadAll = useCallback(async () => {
		setLoading(true);
		try {
			const [u, ae, w, a, pu, pc] = await Promise.all([
				adminApi.users.list(),
				adminApi.allowedEmails.list(),
				adminApi.waitlistEntries.list(),
				adminApi.unauthorizedAttempts.list(),
				adminApi.promoCodeUsages.list(),
				adminApi.promoCodes.list(),
			]);
			setUsers(u.data);
			setAllowedEmails(ae.data);
			setWaitlistEntries(w.data);
			setAttempts(a.data);
			setPromoCodeUsages(pu.data);
			setPromoCodes(pc.data);
		} catch {
			// errors handled below
		} finally {
			setLoading(false);
		}
	}, []);

	const totalCredits = users.reduce(
		(total, user) => total + (Number(user.credits) || 0),
		0,
	);
	const activeUsers = users.filter((user) => user.is_active).length;
	const activationRate = users.length
		? `${Math.round((activeUsers / users.length) * 100)}% active`
		: 'No users yet';
	const waitlistConversion =
		waitlistEntries.length + allowedEmails.length
			? `${Math.round(
					(allowedEmails.length /
						(waitlistEntries.length + allowedEmails.length)) *
						100,
				)}% approved`
			: 'No access requests';
	const lastAttemptAt = getLatestDate(attempts, 'timestamp');
	const latestRedemption = getLatestDate(promoCodeUsages, 'redeemed_at');

	// Verify admin access first
	useEffect(() => {
		adminApi
			.me()
			.then(() => {
				setAuthorized(true);
				loadAll();
			})
			.catch(() => navigate('/landing'));
	}, [navigate, loadAll]);

	if (!authorized || loading) return <Spinner />;

	return (
		<div className="admin-dashboard">
			<section className="admin-hero">
				<div className="admin-hero-copy">
					<Badge
						tone="navy"
						color="#ffffff"
					>
						Operations Control Center
					</Badge>
					<h1 className="admin-title">Executive Admin Dashboard</h1>
					<p className="admin-subtitle">
						Monitor access, revenue levers, and platform integrity
						from one controlled surface. All existing admin actions
						remain live.
					</p>
					<div className="admin-hero-actions">
						<button
							className="btn"
							onClick={loadAll}
						>
							<RefreshCw size={15} /> Refresh Live Data
						</button>
						<button
							className="btn-secondary admin-secondary-button"
							onClick={() => navigate('/simulations')}
						>
							Return to Platform <ArrowUpRight size={15} />
						</button>
					</div>
				</div>
				<div className="admin-hero-aside">
					<InsightCard
						title="Access Pipeline"
						value={waitlistConversion}
						detail={`${allowedEmails.length} approved, ${waitlistEntries.length} pending review`}
						icon={MailPlus}
						tone="gold"
					/>
					<InsightCard
						title="Fraud Watch"
						value={
							attempts.length
								? `${attempts.length} flagged`
								: 'Clear'
						}
						detail={
							lastAttemptAt
								? `Latest attempt ${formatDateTime(lastAttemptAt)}`
								: 'No unauthorized registrations logged'
						}
						icon={ShieldAlert}
						tone="crimson"
					/>
				</div>
			</section>

			<section className="admin-brief-grid">
				<div className="card admin-brief-card">
					<div className="admin-brief-header">
						<div>
							<p className="admin-eyebrow">Operational Brief</p>
							<h2 className="admin-brief-title">
								Platform health at a glance
							</h2>
						</div>
						<Activity
							size={18}
							color="var(--accent-color)"
						/>
					</div>
					<div className="admin-brief-list">
						<div className="admin-brief-item">
							<TrendingUp size={16} />
							<span>
								{activeUsers} active accounts currently
								provisioned.
							</span>
						</div>
						<div className="admin-brief-item">
							<MailPlus size={16} />
							<span>
								{allowedEmails.length} users cleared for
								onboarding from the access list.
							</span>
						</div>
						<div className="admin-brief-item">
							<Clock3 size={16} />
							<span>
								{waitlistEntries.length} contacts are waiting
								for manual review or promotion.
							</span>
						</div>
						<div className="admin-brief-item">
							<Sparkles size={16} />
							<span>
								{promoCodes.length} promotion programs are
								available for controlled distribution.
							</span>
						</div>
					</div>
				</div>

				<div className="card admin-brief-card admin-brief-card-accent">
					<div className="admin-brief-header">
						<div>
							<p className="admin-eyebrow">Key Metrics</p>
							<h2 className="admin-brief-title">
								Executive scorecard
							</h2>
						</div>
						<Database
							size={18}
							color="var(--accent-color)"
						/>
					</div>
					<div className="admin-brief-metrics">
						<MetricCard
							icon={Users}
							label="User Base"
							value={formatNumber(users.length)}
							detail={activationRate}
							tone="navy"
						/>
						<MetricCard
							icon={Coins}
							label="Credits in Circulation"
							value={formatCurrency(totalCredits)}
							detail={`${promoCodeUsages.length} promo redemptions captured`}
							tone="emerald"
						/>
						<MetricCard
							icon={Tag}
							label="Active Promotions"
							value={formatNumber(promoCodes.length)}
							detail={
								latestRedemption
									? `Latest redemption ${formatDateTime(latestRedemption)}`
									: 'No promo usage yet'
							}
							tone="gold"
						/>
						<MetricCard
							icon={Database}
							label="Operational Records"
							value={formatNumber(
								users.length +
									allowedEmails.length +
									waitlistEntries.length +
									attempts.length +
									promoCodes.length +
									promoCodeUsages.length,
							)}
							detail="Across users, access control, and promotions"
							tone="slate"
						/>
					</div>
				</div>
			</section>

			{/* Users */}
			<Section
				icon={Users}
				title="Users"
				subtitle="Account status, email identity, and credit allocation"
				count={users.length}
			>
				<AdminTable
					rows={users}
					columns={[
						{ key: 'id', label: 'ID' },
						{ key: 'email', label: 'Email' },
						{
							key: 'is_active',
							label: 'Active',
							render: (v) => (
								<Badge
									color={v ? '#166534' : '#991b1b'}
									tone={v ? 'success' : 'danger'}
								>
									{v ? 'Yes' : 'No'}
								</Badge>
							),
						},
						{
							key: 'credits',
							label: 'Credits (USD)',
							render: (v) => formatCurrency(v),
						},
					]}
					editableFields={['email', 'is_active', 'credits']}
					onSave={async (id, vals) => {
						await adminApi.users.update(id, vals);
						await loadAll();
					}}
					onDelete={async (id) => {
						await adminApi.users.delete(id);
						await loadAll();
					}}
				/>
			</Section>

			{/* Allowed Emails */}
			<Section
				icon={ShieldCheck}
				title="Allowed Emails"
				subtitle="Manual and waitlist-promoted access approvals"
				count={allowedEmails.length}
			>
				<AdminTable
					rows={allowedEmails}
					columns={[
						{ key: 'id', label: 'ID' },
						{ key: 'email', label: 'Email' },
						{
							key: 'promoted_from_waitlist',
							label: 'Source',
							render: (v) => (
								<Badge
									color={
										v ? '#1d4ed8' : 'var(--text-secondary)'
									}
									tone={v ? 'info' : 'neutral'}
								>
									{v ? 'Waitlist' : 'Manual'}
								</Badge>
							),
						},
						{
							key: 'added_at',
							label: 'Added',
							render: (v) => formatDateTime(v),
						},
					]}
					editableFields={[]}
					onDelete={async (id) => {
						await adminApi.allowedEmails.delete(id);
						await loadAll();
					}}
					addRow={{
						label: 'Add Email',
						fields: [
							{
								key: 'email',
								label: 'Email address',
								type: 'text',
								width: 260,
							},
						],
						onAdd: async (vals) => {
							await adminApi.allowedEmails.add(vals.email);
							await loadAll();
						},
					}}
				/>
			</Section>

			{/* Waitlist Entries */}
			<Section
				icon={ListPlus}
				title="Waitlist Entries"
				subtitle="Pending access requests awaiting review or promotion"
				count={waitlistEntries.length}
			>
				<AdminTable
					rows={waitlistEntries}
					columns={[
						{ key: 'id', label: 'ID' },
						{ key: 'email', label: 'Email' },
						{ key: 'ip_address', label: 'IP Address' },
						{
							key: 'created_at',
							label: 'Created',
							render: (v) => formatDateTime(v),
						},
					]}
					editableFields={[]}
					customActions={[
						{
							icon: UserCheck,
							label: 'Promote to Allow List',
							color: '#16a34a',
							confirm: true,
							confirmTitle: 'Promote to Allow List',
							confirmMessage: (row) =>
								`Move ${row.email} from the waitlist to the allow list? They will receive a welcome email.`,
							confirmLabel: 'Promote',
							onClick: async (row) => {
								await adminApi.waitlistEntries.promote(row.id);
								await loadAll();
							},
						},
					]}
				/>
			</Section>

			{/* Unauthorized Register Attempts */}
			<Section
				icon={AlertTriangle}
				title="Unauthorized Register Attempts"
				subtitle="Suspicious registration events requiring audit awareness"
				count={attempts.length}
			>
				<AdminTable
					rows={attempts}
					columns={[
						{ key: 'id', label: 'ID' },
						{ key: 'email', label: 'Email' },
						{ key: 'ip_address', label: 'IP Address' },
						{
							key: 'timestamp',
							label: 'Timestamp',
							render: (v) => formatDateTime(v),
						},
					]}
					editableFields={[]}
				/>
			</Section>

			{/* Promo Codes */}
			<Section
				icon={Tag}
				title="Promo Codes"
				subtitle="Credit campaigns, allocation limits, and redemption design"
				count={promoCodes.length}
			>
				<AdminTable
					rows={promoCodes}
					columns={[
						{ key: 'id', label: 'ID' },
						{ key: 'code', label: 'Code' },
						{
							key: 'val',
							label: 'Credits',
							type: 'number',
							render: (v) => formatNumber(v),
						},
						{ key: 'users', label: 'Max Uses', type: 'number' },
						{
							key: 'created_at',
							label: 'Created',
							render: (v) => formatDateTime(v),
						},
					]}
					editableFields={['val', 'users']}
					onSave={async (id, vals) => {
						await adminApi.promoCodes.update(id, vals);
						await loadAll();
					}}
					onDelete={async (id) => {
						await adminApi.promoCodes.delete(id);
						await loadAll();
					}}
					addRow={{
						label: 'Create Code',
						fields: [
							{
								key: 'code',
								label: 'Code (e.g. LAUNCH50)',
								type: 'text',
								width: 180,
							},
							{
								key: 'val',
								label: 'Credits',
								type: 'number',
								default: 500,
								width: 90,
							},
							{
								key: 'users',
								label: 'Max Uses',
								type: 'number',
								default: 100,
								width: 90,
							},
						],
						onAdd: async (vals) => {
							await adminApi.promoCodes.create({
								code: vals.code,
								val: Number(vals.val),
								users: Number(vals.users),
							});
							await loadAll();
						},
					}}
				/>
			</Section>

			{/* Promo Code Usages */}
			<Section
				icon={Coins}
				title="Promo Code Usages"
				subtitle="Redemption history across accounts and campaigns"
				count={promoCodeUsages.length}
			>
				<AdminTable
					rows={promoCodeUsages}
					columns={[
						{ key: 'id', label: 'ID' },
						{ key: 'user_id', label: 'User ID' },
						{ key: 'email', label: 'Email' },
						{ key: 'code', label: 'Code' },
						{
							key: 'redeemed_at',
							label: 'Redeemed At',
							render: (v) => formatDateTime(v),
						},
					]}
					editableFields={[]}
				/>
			</Section>
		</div>
	);
}
