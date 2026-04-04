import React, { useState, useRef } from 'react';
import { X, Upload, Download, CheckCircle2, AlertTriangle } from 'lucide-react';
import api from '../../api';

export default function BulkImportModal({ open, onClose, onImported }) {
	const [file, setFile] = useState(null);
	const [uploading, setUploading] = useState(false);
	const [error, setError] = useState('');
	const [preview, setPreview] = useState(null); // eslint-disable-line no-unused-vars
	const fileRef = useRef(null);

	const handleFile = (f) => {
		setFile(f);
		setError('');
		setPreview(null);
	};

	const handleDrop = (e) => {
		e.preventDefault();
		const f = e.dataTransfer.files[0];
		if (f) handleFile(f);
	};

	const handleImport = async () => {
		if (!file) return;
		setUploading(true);
		setError('');
		try {
			const formData = new FormData();
			formData.append('file', file);
			const res = await api.post(
				'/small-world/agents/bulk-import',
				formData,
				{
					headers: { 'Content-Type': 'multipart/form-data' },
				},
			);
			onImported(res.data);
			onClose();
		} catch (err) {
			setError(
				err.response?.data?.detail ||
					'Import failed. Check your file format.',
			);
		} finally {
			setUploading(false);
		}
	};

	const handleDownloadTemplate = async () => {
		try {
			const res = await api.get('/small-world/agents/template', {
				responseType: 'blob',
			});
			const url = URL.createObjectURL(res.data);
			const a = document.createElement('a');
			a.href = url;
			a.download = 'small_world_agents_template.xlsx';
			a.click();
			URL.revokeObjectURL(url);
		} catch {
			alert('Could not download template');
		}
	};

	if (!open) return null;

	return (
		<div
			style={{
				position: 'fixed',
				inset: 0,
				background: 'rgba(0,0,0,0.35)',
				backdropFilter: 'blur(4px)',
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
					maxWidth: '480px',
					padding: '1.5rem',
					borderRadius: '16px',
				}}
				onClick={(e) => e.stopPropagation()}
			>
				<div
					style={{
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'center',
						marginBottom: '1.25rem',
					}}
				>
					<div>
						<h2
							style={{
								margin: 0,
								fontSize: '1.05rem',
								fontWeight: 700,
							}}
						>
							Bulk Import Agents
						</h2>
						<p
							style={{
								margin: '0.2rem 0 0',
								fontSize: '0.8rem',
								color: 'var(--text-secondary)',
							}}
						>
							Upload an Excel or CSV file with agent data
						</p>
					</div>
					<button
						onClick={onClose}
						style={{
							background: 'none',
							border: 'none',
							cursor: 'pointer',
							color: 'var(--text-secondary)',
							padding: '0.25rem',
							display: 'flex',
						}}
					>
						<X size={20} />
					</button>
				</div>

				{/* Download template */}
				<div
					style={{
						padding: '0.75rem 1rem',
						background: 'var(--surface-container-low)',
						borderRadius: '9px',
						marginBottom: '1rem',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'space-between',
					}}
				>
					<div>
						<p
							style={{
								margin: 0,
								fontSize: '0.83rem',
								fontWeight: 600,
							}}
						>
							Need a template?
						</p>
						<p
							style={{
								margin: '0.1rem 0 0',
								fontSize: '0.75rem',
								color: 'var(--text-secondary)',
							}}
						>
							Download our Excel template with all required
							columns pre-filled.
						</p>
					</div>
					<button
						onClick={handleDownloadTemplate}
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: '0.35rem',
							padding: '0.45rem 0.9rem',
							background: 'var(--surface-container-highest)',
							border: '1px solid var(--outline-variant)',
							borderRadius: '7px',
							fontSize: '0.78rem',
							fontWeight: 600,
							cursor: 'pointer',
							flexShrink: 0,
							marginLeft: '0.75rem',
						}}
					>
						<Download size={13} /> Template
					</button>
				</div>

				{/* Drop zone */}
				<div
					onDrop={handleDrop}
					onDragOver={(e) => e.preventDefault()}
					onClick={() => fileRef.current?.click()}
					style={{
						border: `2px dashed ${file ? '#16a34a' : 'var(--outline-variant)'}`,
						borderRadius: '10px',
						padding: '1.5rem',
						textAlign: 'center',
						cursor: 'pointer',
						background: file
							? '#f0fdf4'
							: 'var(--surface-container-low)',
						transition: 'border-color 0.2s, background 0.2s',
						marginBottom: '1rem',
					}}
				>
					<input
						ref={fileRef}
						type="file"
						accept=".xlsx,.xls,.csv"
						onChange={(e) => handleFile(e.target.files[0])}
						style={{ display: 'none' }}
					/>
					{file ? (
						<div
							style={{
								display: 'flex',
								flexDirection: 'column',
								alignItems: 'center',
								gap: '0.4rem',
							}}
						>
							<CheckCircle2
								size={24}
								color="#16a34a"
							/>
							<p
								style={{
									margin: 0,
									fontWeight: 600,
									fontSize: '0.85rem',
									color: '#16a34a',
								}}
							>
								{file.name}
							</p>
							<p
								style={{
									margin: 0,
									fontSize: '0.75rem',
									color: 'var(--text-secondary)',
								}}
							>
								{(file.size / 1024).toFixed(1)} KB · Click to
								change
							</p>
						</div>
					) : (
						<div
							style={{
								display: 'flex',
								flexDirection: 'column',
								alignItems: 'center',
								gap: '0.4rem',
							}}
						>
							<Upload
								size={24}
								color="var(--text-secondary)"
							/>
							<p
								style={{
									margin: 0,
									fontWeight: 600,
									fontSize: '0.85rem',
								}}
							>
								Drop file here or click to browse
							</p>
							<p
								style={{
									margin: 0,
									fontSize: '0.75rem',
									color: 'var(--text-secondary)',
								}}
							>
								.xlsx, .xls, or .csv
							</p>
						</div>
					)}
				</div>

				{error && (
					<div
						style={{
							display: 'flex',
							alignItems: 'flex-start',
							gap: '0.5rem',
							padding: '0.6rem 0.85rem',
							background: '#fee2e2',
							borderRadius: '8px',
							marginBottom: '1rem',
						}}
					>
						<AlertTriangle
							size={14}
							color="#dc2626"
							style={{ marginTop: 2, flexShrink: 0 }}
						/>
						<p
							style={{
								margin: 0,
								fontSize: '0.8rem',
								color: '#dc2626',
							}}
						>
							{error}
						</p>
					</div>
				)}

				<div
					style={{
						display: 'flex',
						justifyContent: 'flex-end',
						gap: '0.5rem',
					}}
				>
					<button
						onClick={onClose}
						style={{
							padding: '0.6rem 1.2rem',
							background: 'var(--surface-container-high)',
							border: '1px solid var(--outline-variant)',
							borderRadius: '8px',
							fontSize: '0.85rem',
							cursor: 'pointer',
						}}
					>
						Cancel
					</button>
					<button
						onClick={handleImport}
						disabled={!file || uploading}
						style={{
							padding: '0.6rem 1.4rem',
							background: 'var(--accent-color)',
							color: '#fff',
							border: 'none',
							borderRadius: '8px',
							fontSize: '0.85rem',
							fontWeight: 600,
							cursor:
								!file || uploading ? 'not-allowed' : 'pointer',
							opacity: !file || uploading ? 0.6 : 1,
							display: 'flex',
							alignItems: 'center',
							gap: '0.4rem',
						}}
					>
						{uploading ? (
							'Importing…'
						) : (
							<>
								<Upload size={14} /> Import Agents
							</>
						)}
					</button>
				</div>
			</div>
		</div>
	);
}
