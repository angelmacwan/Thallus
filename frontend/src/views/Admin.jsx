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
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────

function Badge({ children, color = 'var(--text-secondary)' }) {
	return (
		<span
			style={{
				fontSize: '0.7rem',
				fontWeight: 600,
				padding: '0.15rem 0.5rem',
				borderRadius: '999px',
				background: 'var(--surface-container-high)',
				color,
				border: '1px solid var(--border-color)',
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

function ConfirmDeleteModal({ target, onConfirm, onCancel }) {
	if (!target) return null;
	return (
		<div
			style={{
				position: 'fixed',
				inset: 0,
				background: 'rgba(0,0,0,0.45)',
				backdropFilter: 'blur(4px)',
				zIndex: 3000,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
			}}
			onClick={onCancel}
		>
			<div
				className="card"
				style={{ padding: '1.5rem', maxWidth: 400, width: '90%' }}
				onClick={(e) => e.stopPropagation()}
			>
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: '0.6rem',
						marginBottom: '1rem',
					}}
				>
					<AlertTriangle
						size={18}
						color="#dc2626"
					/>
					<h3 style={{ margin: 0, fontSize: '1rem' }}>
						Confirm Delete
					</h3>
				</div>
				<p
					style={{
						fontSize: '0.88rem',
						color: 'var(--text-secondary)',
						marginBottom: '1.25rem',
					}}
				>
					{target.label} This action cannot be undone.
				</p>
				<div
					style={{
						display: 'flex',
						gap: '0.5rem',
						justifyContent: 'flex-end',
					}}
				>
					<button
						className="btn-secondary"
						onClick={onCancel}
						style={{ fontSize: '0.85rem' }}
					>
						Cancel
					</button>
					<button
						onClick={onConfirm}
						style={{
							fontSize: '0.85rem',
							background: '#dc2626',
							color: '#fff',
							border: 'none',
							borderRadius: '6px',
							padding: '0.4rem 1rem',
							cursor: 'pointer',
							fontWeight: 600,
						}}
					>
						Delete
					</button>
				</div>
			</div>
		</div>
	);
}

// ── Section wrapper ────────────────────────────────────────────────────────────

function Section({ icon: Icon, title, count, children }) {
	const [open, setOpen] = useState(true);
	return (
		<div
			className="card"
			style={{ marginBottom: '1.25rem', overflow: 'hidden' }}
		>
			<button
				onClick={() => setOpen((o) => !o)}
				style={{
					width: '100%',
					display: 'flex',
					alignItems: 'center',
					gap: '0.6rem',
					background: 'none',
					border: 'none',
					cursor: 'pointer',
					padding: '1rem 1.25rem',
					color: 'var(--text-primary)',
					textAlign: 'left',
				}}
			>
				<Icon
					size={16}
					color="var(--accent-color)"
				/>
				<span style={{ fontWeight: 700, fontSize: '0.95rem', flex: 1 }}>
					{title}
				</span>
				{count !== undefined && (
					<Badge>
						{count} row{count !== 1 ? 's' : ''}
					</Badge>
				)}
				{open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
			</button>
			{open && (
				<div
					style={{
						borderTop: '1px solid var(--border-color)',
						overflowX: 'auto',
					}}
				>
					{children}
				</div>
			)}
		</div>
	);
}

// ── Generic table ──────────────────────────────────────────────────────────────

function AdminTable({ columns, rows, onDelete, onSave, editableFields }) {
	const [editingId, setEditingId] = useState(null);
	const [editValues, setEditValues] = useState({});
	const [deleteTarget, setDeleteTarget] = useState(null);

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
			<ConfirmDeleteModal
				target={deleteTarget}
				onConfirm={handleDelete}
				onCancel={() => setDeleteTarget(null)}
			/>
			<table
				style={{
					width: '100%',
					borderCollapse: 'collapse',
					fontSize: '0.83rem',
				}}
			>
				<thead>
					<tr style={{ background: 'var(--surface-container-high)' }}>
						{columns.map((col) => (
							<th
								key={col.key}
								style={{
									padding: '0.55rem 1rem',
									textAlign: 'left',
									fontWeight: 600,
									fontSize: '0.72rem',
									letterSpacing: '0.05em',
									textTransform: 'uppercase',
									color: 'var(--text-secondary)',
									borderBottom:
										'1px solid var(--border-color)',
									whiteSpace: 'nowrap',
								}}
							>
								{col.label}
							</th>
						))}
						<th
							style={{
								padding: '0.55rem 1rem',
								borderBottom: '1px solid var(--border-color)',
							}}
						/>
					</tr>
				</thead>
				<tbody>
					{rows.map((row) => {
						const isEditing = editingId === row.id;
						return (
							<tr
								key={row.id}
								style={{
									borderBottom:
										'1px solid var(--border-color)',
									background: isEditing
										? 'var(--surface-container-high)'
										: undefined,
								}}
							>
								{columns.map((col) => {
									const isEditable = editableFields?.includes(
										col.key,
									);
									return (
										<td
											key={col.key}
											style={{
												padding: '0.55rem 1rem',
												verticalAlign: 'middle',
												whiteSpace: 'nowrap',
											}}
										>
											{isEditing && isEditable ? (
												<input
													value={
														editValues[col.key] ??
														''
													}
													onChange={(e) =>
														setEditValues((v) => ({
															...v,
															[col.key]:
																col.type ===
																'number'
																	? parseFloat(
																			e
																				.target
																				.value,
																		)
																	: e.target
																			.value,
														}))
													}
													type={col.type || 'text'}
													step={
														col.type === 'number'
															? '0.000001'
															: undefined
													}
													style={{
														background:
															'var(--surface-container)',
														border: '1px solid var(--accent-color)',
														borderRadius: '4px',
														padding:
															'0.25rem 0.4rem',
														color: 'var(--text-primary)',
														fontSize: '0.83rem',
														width: '100%',
														minWidth: 80,
													}}
												/>
											) : col.render ? (
												col.render(row[col.key], row)
											) : (
												<span
													style={{
														color:
															row[col.key] == null
																? 'var(--text-secondary)'
																: undefined,
													}}
												>
													{row[col.key] != null
														? String(row[col.key])
														: '—'}
												</span>
											)}
										</td>
									);
								})}
								<td
									style={{
										padding: '0.4rem 1rem',
										verticalAlign: 'middle',
										whiteSpace: 'nowrap',
									}}
								>
									<div
										style={{
											display: 'flex',
											gap: '0.35rem',
											justifyContent: 'flex-end',
										}}
									>
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
													editableFields.length > 0 &&
													onSave && (
														<button
															onClick={() =>
																startEdit(row)
															}
															title="Edit"
															style={iconBtnStyle(
																'var(--accent-color)',
															)}
														>
															<Pencil size={13} />
														</button>
													)}
												{onDelete && (
													<button
														onClick={() =>
															setDeleteTarget({
																id: row.id,
																label: `Delete record #${row.id}?`,
															})
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
		</>
	);
}

const iconBtnStyle = (color) => ({
	background: 'none',
	border: '1px solid var(--border-color)',
	borderRadius: '5px',
	padding: '0.25rem 0.4rem',
	cursor: 'pointer',
	color,
	display: 'flex',
	alignItems: 'center',
});

// ── Main Admin View ────────────────────────────────────────────────────────────

export default function Admin() {
	const navigate = useNavigate();
	const [loading, setLoading] = useState(true);
	const [authorized, setAuthorized] = useState(false);
	const [users, setUsers] = useState([]);
	const [waitlistEntries, setWaitlistEntries] = useState([]);
	const [attempts, setAttempts] = useState([]);
	const [promoCodeUsages, setPromoCodeUsages] = useState([]);

	const loadAll = useCallback(async () => {
		setLoading(true);
		try {
			const [u, w, a, p] = await Promise.all([
				adminApi.users.list(),
				adminApi.waitlistEntries.list(),
				adminApi.unauthorizedAttempts.list(),
				adminApi.promoCodeUsages.list(),
			]);
			setUsers(u.data);
			setWaitlistEntries(w.data);
			setAttempts(a.data);
			setPromoCodeUsages(p.data);
		} catch {
			// errors handled below
		} finally {
			setLoading(false);
		}
	}, []);

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
		<div
			style={{ padding: '1.5rem 2rem', maxWidth: 1200, margin: '0 auto' }}
		>
			{/* Header */}
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					marginBottom: '1.5rem',
				}}
			>
				<div>
					<h1
						style={{
							margin: 0,
							fontSize: '1.4rem',
							fontWeight: 800,
						}}
					>
						Admin Panel
					</h1>
					<p
						style={{
							margin: '0.25rem 0 0',
							fontSize: '0.85rem',
							color: 'var(--text-secondary)',
						}}
					>
						View, edit, and delete database records
					</p>
				</div>
				<button
					className="btn-secondary"
					onClick={loadAll}
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: '0.4rem',
						fontSize: '0.83rem',
					}}
				>
					<RefreshCw size={13} /> Refresh
				</button>
			</div>

			{/* Users */}
			<Section
				icon={Users}
				title="Users"
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
								<Badge color={v ? '#16a34a' : '#dc2626'}>
									{v ? 'Yes' : 'No'}
								</Badge>
							),
						},
						{
							key: 'credits',
							label: 'Credits (USD)',
							render: (v) => v?.toFixed(6),
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

			{/* Waitlist Entries */}
			<Section
				icon={ListPlus}
				title="Waitlist Entries"
				count={waitlistEntries.length}
			>
				<AdminTable
					rows={waitlistEntries}
					columns={[
						{ key: 'id', label: 'ID' },
						{ key: 'email', label: 'Email' },
						{ key: 'ip_address', label: 'IP Address' },
						{ key: 'created_at', label: 'Created' },
					]}
					editableFields={[]}
				/>
			</Section>

			{/* Unauthorized Register Attempts */}
			<Section
				icon={AlertTriangle}
				title="Unauthorized Register Attempts"
				count={attempts.length}
			>
				<AdminTable
					rows={attempts}
					columns={[
						{ key: 'id', label: 'ID' },
						{ key: 'email', label: 'Email' },
						{ key: 'ip_address', label: 'IP Address' },
						{ key: 'timestamp', label: 'Timestamp' },
					]}
					editableFields={[]}
				/>
			</Section>

			{/* Promo Code Usages */}
			<Section
				icon={Coins}
				title="Promo Code Usages"
				count={promoCodeUsages.length}
			>
				<AdminTable
					rows={promoCodeUsages}
					columns={[
						{ key: 'id', label: 'ID' },
						{ key: 'user_id', label: 'User ID' },
						{ key: 'email', label: 'Email' },
						{ key: 'code', label: 'Code' },
						{ key: 'redeemed_at', label: 'Redeemed At' },
					]}
					editableFields={[]}
				/>
			</Section>
		</div>
	);
}
