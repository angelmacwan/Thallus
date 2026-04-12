import React, { useState } from 'react';
import { X, ChevronDown, ChevronUp, Wand2 } from 'lucide-react';
import { AGENT_TEMPLATES } from './AgentTemplates';

const BIG_FIVE = [
	'openness',
	'conscientiousness',
	'extraversion',
	'agreeableness',
	'neuroticism',
];
const DECISION_STYLES = ['analytical', 'emotional', 'impulsive'];
const COMMUNICATION_STYLES = ['direct', 'passive', 'aggressive'];
const INFLUENCE_DIRECTIONS = ['source_to_target', 'target_to_source', 'both'];

function Section({ title, open, onToggle, children }) {
	return (
		<div
			style={{
				border: '1px solid var(--outline-variant)',
				borderRadius: '10px',
				overflow: 'hidden',
				marginBottom: '0.75rem',
			}}
		>
			<button
				type="button"
				onClick={onToggle}
				style={{
					width: '100%',
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
					padding: '0.7rem 1rem',
					background: 'var(--surface-container-low)',
					border: 'none',
					cursor: 'pointer',
					fontWeight: 600,
					fontSize: '0.82rem',
					color: 'var(--text-primary)',
				}}
			>
				{title}
				{open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
			</button>
			{open && <div style={{ padding: '1rem' }}>{children}</div>}
		</div>
	);
}

function Field({ label, children }) {
	return (
		<div style={{ marginBottom: '0.75rem' }}>
			<label
				style={{
					display: 'block',
					fontSize: '0.75rem',
					fontWeight: 600,
					color: 'var(--text-secondary)',
					marginBottom: '0.3rem',
					textTransform: 'uppercase',
					letterSpacing: '0.05em',
				}}
			>
				{label}
			</label>
			{children}
		</div>
	);
}

function Input({ value, onChange, placeholder, type = 'text' }) {
	return (
		<input
			type={type}
			value={value ?? ''}
			onChange={(e) => onChange(e.target.value)}
			placeholder={placeholder}
			style={{
				width: '100%',
				padding: '0.5rem 0.75rem',
				background: 'var(--surface-container-lowest)',
				border: '1px solid var(--outline-variant)',
				borderRadius: '7px',
				fontSize: '0.83rem',
				color: 'var(--text-primary)',
				outline: 'none',
			}}
		/>
	);
}

function Slider({ value, onChange, label }) {
	const pct = value != null ? Math.round(value * 100) : '—';
	return (
		<div style={{ marginBottom: '0.5rem' }}>
			<div
				style={{
					display: 'flex',
					justifyContent: 'space-between',
					marginBottom: '0.2rem',
				}}
			>
				<span
					style={{
						fontSize: '0.75rem',
						color: 'var(--text-secondary)',
						textTransform: 'capitalize',
					}}
				>
					{label}
				</span>
				<span
					style={{
						fontSize: '0.75rem',
						fontWeight: 600,
						color: 'var(--text-primary)',
					}}
				>
					{pct}
					{value != null ? '%' : ''}
				</span>
			</div>
			<input
				type="range"
				min="0"
				max="100"
				value={value != null ? Math.round(value * 100) : 50}
				onChange={(e) => onChange(Number(e.target.value) / 100)}
				style={{ width: '100%', accentColor: 'var(--accent-color)' }}
			/>
		</div>
	);
}

function Select({ value, onChange, options }) {
	return (
		<select
			value={value ?? ''}
			onChange={(e) => onChange(e.target.value)}
			style={{
				width: '100%',
				padding: '0.5rem 0.75rem',
				background: 'var(--surface-container-lowest)',
				border: '1px solid var(--outline-variant)',
				borderRadius: '7px',
				fontSize: '0.83rem',
				color: 'var(--text-primary)',
				outline: 'none',
			}}
		>
			<option value="">Select…</option>
			{options.map((o) => (
				<option
					key={o}
					value={o}
				>
					{o}
				</option>
			))}
		</select>
	);
}

function TagInput({ values, onChange, placeholder }) {
	const [input, setInput] = useState('');
	const items = Array.isArray(values) ? values : [];
	const add = () => {
		const v = input.trim();
		if (v && !items.includes(v)) onChange([...items, v]);
		setInput('');
	};
	return (
		<div>
			<div
				style={{
					display: 'flex',
					flexWrap: 'wrap',
					gap: '0.3rem',
					marginBottom: '0.4rem',
				}}
			>
				{items.map((item) => (
					<span
						key={item}
						style={{
							display: 'inline-flex',
							alignItems: 'center',
							gap: '0.25rem',
							padding: '0.15rem 0.5rem',
							background: 'var(--secondary-container)',
							borderRadius: '999px',
							fontSize: '0.75rem',
							color: 'var(--on-secondary-container)',
						}}
					>
						{item}
						<button
							type="button"
							onClick={() =>
								onChange(items.filter((i) => i !== item))
							}
							style={{
								background: 'none',
								border: 'none',
								cursor: 'pointer',
								lineHeight: 1,
								padding: 0,
								color: 'var(--text-secondary)',
							}}
						>
							×
						</button>
					</span>
				))}
			</div>
			<div style={{ display: 'flex', gap: '0.4rem' }}>
				<input
					value={input}
					onChange={(e) => setInput(e.target.value)}
					onKeyDown={(e) =>
						e.key === 'Enter' && (e.preventDefault(), add())
					}
					placeholder={placeholder}
					style={{
						flex: 1,
						padding: '0.45rem 0.75rem',
						background: 'var(--surface-container-lowest)',
						border: '1px solid var(--outline-variant)',
						borderRadius: '7px',
						fontSize: '0.8rem',
						color: 'var(--text-primary)',
						outline: 'none',
					}}
				/>
				<button
					type="button"
					onClick={add}
					style={{
						padding: '0.45rem 0.85rem',
						background: 'var(--surface-container-high)',
						border: '1px solid var(--outline-variant)',
						borderRadius: '7px',
						fontSize: '0.8rem',
						cursor: 'pointer',
					}}
				>
					Add
				</button>
			</div>
		</div>
	);
}

const EMPTY_FORM = {
	name: '',
	age: '',
	gender: '',
	location: '',
	profession: '',
	job_title: '',
	organization: '',
	personality_traits: {
		openness: null,
		conscientiousness: null,
		extraversion: null,
		agreeableness: null,
		neuroticism: null,
		risk_tolerance: null,
		decision_style: '',
		motivation_drivers: [],
		core_beliefs: '',
		biases: [],
	},
	behavioral_attributes: {
		communication_style: '',
		influence_level: null,
		adaptability: null,
		loyalty: null,
		stress_response: '',
	},
	contextual_state: {
		current_goals: [],
		current_frustrations: [],
		incentives: [],
		constraints: [],
	},
	external_factors: { salary: '', work_environment: '', market_exposure: '' },
};

export default function CreateAgentModal({
	open,
	onClose,
	onSave,
	initialData = null,
}) {
	const [form, setForm] = useState(
		initialData ? { ...EMPTY_FORM, ...initialData } : EMPTY_FORM,
	);
	const [sections, setSections] = useState({
		identity: true,
		personality: false,
		behavioral: false,
		contextual: false,
		external: false,
	});
	const [saving, setSaving] = useState(false);

	React.useEffect(() => {
		if (open) {
			setForm(
				initialData ? { ...EMPTY_FORM, ...initialData } : EMPTY_FORM,
			);
		}
	}, [open, initialData]);

	const setField = (path, value) => {
		const parts = path.split('.');
		setForm((prev) => {
			if (parts.length === 1) return { ...prev, [parts[0]]: value };
			return {
				...prev,
				[parts[0]]: { ...prev[parts[0]], [parts[1]]: value },
			};
		});
	};

	const applyTemplate = (key) => {
		const tpl = AGENT_TEMPLATES[key];
		if (!tpl) return;
		setForm((prev) => ({
			...prev,
			profession: tpl.profession || '',
			job_title: tpl.job_title || '',
			personality_traits: {
				...EMPTY_FORM.personality_traits,
				...tpl.personality_traits,
			},
			behavioral_attributes: {
				...EMPTY_FORM.behavioral_attributes,
				...tpl.behavioral_attributes,
			},
			contextual_state: {
				...EMPTY_FORM.contextual_state,
				...tpl.contextual_state,
			},
			external_factors: {
				...EMPTY_FORM.external_factors,
				...tpl.external_factors,
			},
		}));
	};

	const toggleSection = (key) =>
		setSections((prev) => ({ ...prev, [key]: !prev[key] }));

	const handleSave = async (e) => {
		e.preventDefault();
		if (!form.name.trim()) return alert('Name is required');
		setSaving(true);
		try {
			const payload = {
				name: form.name.trim(),
				age: form.age ? Number(form.age) : null,
				gender: form.gender || null,
				location: form.location || null,
				profession: form.profession || null,
				job_title: form.job_title || null,
				organization: form.organization || null,
				personality_traits: form.personality_traits,
				behavioral_attributes: form.behavioral_attributes,
				contextual_state: form.contextual_state,
				external_factors: form.external_factors,
			};
			await onSave(payload);
			onClose();
		} finally {
			setSaving(false);
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
					maxWidth: '600px',
					maxHeight: '90vh',
					overflowY: 'auto',
					padding: '1.5rem',
					borderRadius: '16px',
				}}
				onClick={(e) => e.stopPropagation()}
			>
				{/* Header */}
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
								fontSize: '1.1rem',
								fontWeight: 700,
							}}
						>
							{initialData ? 'Edit Agent' : 'Create Agent'}
						</h2>
						<p
							style={{
								margin: '0.2rem 0 0',
								fontSize: '0.8rem',
								color: 'var(--text-secondary)',
							}}
						>
							Build a detailed persona for your simulation
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

				{/* Templates */}
				{!initialData && (
					<div style={{ marginBottom: '1rem' }}>
						<p
							style={{
								fontSize: '0.72rem',
								fontWeight: 700,
								textTransform: 'uppercase',
								letterSpacing: '0.07em',
								color: 'var(--text-secondary)',
								marginBottom: '0.4rem',
							}}
						>
							Start from template
						</p>
						<div
							style={{
								display: 'flex',
								gap: '0.4rem',
								flexWrap: 'wrap',
							}}
						>
							{Object.entries(AGENT_TEMPLATES).map(
								([key, tpl]) => (
									<button
										key={key}
										onClick={() => applyTemplate(key)}
										style={{
											padding: '0.35rem 0.75rem',
											background:
												'var(--surface-container)',
											border: '1px solid var(--outline-variant)',
											borderRadius: '999px',
											fontSize: '0.78rem',
											cursor: 'pointer',
											color: 'var(--text-primary)',
										}}
									>
										{tpl.label}
									</button>
								),
							)}
						</div>
					</div>
				)}

				<form onSubmit={handleSave}>
					{/* Core Identity */}
					<Section
						title="Core Identity"
						open={sections.identity}
						onToggle={() => toggleSection('identity')}
					>
						<div
							style={{
								display: 'grid',
								gridTemplateColumns: '1fr 1fr',
								gap: '0 0.75rem',
							}}
						>
							<div style={{ gridColumn: '1 / -1' }}>
								<Field label="Name *">
									<Input
										value={form.name}
										onChange={(v) => setField('name', v)}
										placeholder="Full name"
									/>
								</Field>
							</div>
							<Field label="Age">
								<Input
									type="number"
									value={form.age}
									onChange={(v) => setField('age', v)}
									placeholder="34"
								/>
							</Field>
							<Field label="Gender">
								<Input
									value={form.gender}
									onChange={(v) => setField('gender', v)}
									placeholder="Optional"
								/>
							</Field>
							<Field label="Location">
								<Input
									value={form.location}
									onChange={(v) => setField('location', v)}
									placeholder="City, Country"
								/>
							</Field>
							<Field label="Profession">
								<Input
									value={form.profession}
									onChange={(v) => setField('profession', v)}
									placeholder="Engineering"
								/>
							</Field>
							<Field label="Job Title">
								<Input
									value={form.job_title}
									onChange={(v) => setField('job_title', v)}
									placeholder="Senior PM"
								/>
							</Field>
							<Field label="Organization">
								<Input
									value={form.organization}
									onChange={(v) =>
										setField('organization', v)
									}
									placeholder="Acme Corp"
								/>
							</Field>
						</div>
					</Section>

					{/* Psychological Profile */}
					<Section
						title="Psychological Profile (Big Five)"
						open={sections.personality}
						onToggle={() => toggleSection('personality')}
					>
						{BIG_FIVE.map((k) => (
							<Slider
								key={k}
								label={k}
								value={form.personality_traits[k]}
								onChange={(v) =>
									setField(`personality_traits.${k}`, v)
								}
							/>
						))}
						<Slider
							label="Risk Tolerance"
							value={form.personality_traits.risk_tolerance}
							onChange={(v) =>
								setField('personality_traits.risk_tolerance', v)
							}
						/>
						<Field label="Decision Style">
							<datalist id="decision-style-suggestions">
								{DECISION_STYLES.map((s) => (
									<option key={s} value={s} />
								))}
							</datalist>
							<input
								list="decision-style-suggestions"
								value={form.personality_traits.decision_style ?? ''}
								onChange={(e) =>
									setField(
										'personality_traits.decision_style',
										e.target.value,
									)
								}
								placeholder="e.g. analytical, emotional, impulsive…"
								style={{
									width: '100%',
									padding: '0.5rem 0.75rem',
									background: 'var(--surface-container-lowest)',
									border: '1px solid var(--outline-variant)',
									borderRadius: '7px',
									fontSize: '0.83rem',
									color: 'var(--text-primary)',
									outline: 'none',
									boxSizing: 'border-box',
								}}
							/>
						</Field>
						<Field label="Motivation Drivers">
							<TagInput
								values={
									form.personality_traits.motivation_drivers
								}
								onChange={(v) =>
									setField(
										'personality_traits.motivation_drivers',
										v,
									)
								}
								placeholder="Add driver (Enter)"
							/>
						</Field>
						<Field label="Core Beliefs">
							<textarea
								value={
									form.personality_traits.core_beliefs ?? ''
								}
								onChange={(e) =>
									setField(
										'personality_traits.core_beliefs',
										e.target.value,
									)
								}
								rows={2}
								style={{
									width: '100%',
									resize: 'vertical',
									padding: '0.5rem 0.75rem',
									background:
										'var(--surface-container-lowest)',
									border: '1px solid var(--outline-variant)',
									borderRadius: '7px',
									fontSize: '0.83rem',
									color: 'var(--text-primary)',
									fontFamily: 'inherit',
									outline: 'none',
								}}
							/>
						</Field>
						<Field label="Biases (optional)">
							<TagInput
								values={form.personality_traits.biases}
								onChange={(v) =>
									setField('personality_traits.biases', v)
								}
								placeholder="Add bias (Enter)"
							/>
						</Field>
					</Section>

					{/* Behavioral Attributes */}
					<Section
						title="Behavioral Attributes"
						open={sections.behavioral}
						onToggle={() => toggleSection('behavioral')}
					>
						<Field label="Communication Style">
							<datalist id="comm-style-suggestions">
								{COMMUNICATION_STYLES.map((s) => (
									<option key={s} value={s} />
								))}
							</datalist>
							<input
								list="comm-style-suggestions"
								value={form.behavioral_attributes.communication_style ?? ''}
								onChange={(e) =>
									setField(
										'behavioral_attributes.communication_style',
										e.target.value,
									)
								}
								placeholder="e.g. direct, passive, assertive…"
								style={{
									width: '100%',
									padding: '0.5rem 0.75rem',
									background: 'var(--surface-container-lowest)',
									border: '1px solid var(--outline-variant)',
									borderRadius: '7px',
									fontSize: '0.83rem',
									color: 'var(--text-primary)',
									outline: 'none',
									boxSizing: 'border-box',
								}}
							/>
						</Field>
						<Slider
							label="Influence Level"
							value={form.behavioral_attributes.influence_level}
							onChange={(v) =>
								setField(
									'behavioral_attributes.influence_level',
									v,
								)
							}
						/>
						<Slider
							label="Adaptability"
							value={form.behavioral_attributes.adaptability}
							onChange={(v) =>
								setField(
									'behavioral_attributes.adaptability',
									v,
								)
							}
						/>
						<Slider
							label="Loyalty"
							value={form.behavioral_attributes.loyalty}
							onChange={(v) =>
								setField('behavioral_attributes.loyalty', v)
							}
						/>
						<Field label="Stress Response">
							<Input
								value={
									form.behavioral_attributes.stress_response
								}
								onChange={(v) =>
									setField(
										'behavioral_attributes.stress_response',
										v,
									)
								}
								placeholder="How they respond under pressure"
							/>
						</Field>
					</Section>

					{/* Contextual State */}
					<Section
						title="Contextual State"
						open={sections.contextual}
						onToggle={() => toggleSection('contextual')}
					>
						<Field label="Current Goals">
							<TagInput
								values={form.contextual_state.current_goals}
								onChange={(v) =>
									setField(
										'contextual_state.current_goals',
										v,
									)
								}
								placeholder="Add goal (Enter)"
							/>
						</Field>
						<Field label="Current Frustrations">
							<TagInput
								values={
									form.contextual_state.current_frustrations
								}
								onChange={(v) =>
									setField(
										'contextual_state.current_frustrations',
										v,
									)
								}
								placeholder="Add frustration (Enter)"
							/>
						</Field>
						<Field label="Incentives">
							<TagInput
								values={form.contextual_state.incentives}
								onChange={(v) =>
									setField('contextual_state.incentives', v)
								}
								placeholder="What they gain/lose"
							/>
						</Field>
						<Field label="Constraints">
							<TagInput
								values={form.contextual_state.constraints}
								onChange={(v) =>
									setField('contextual_state.constraints', v)
								}
								placeholder="Budget, authority, time…"
							/>
						</Field>
					</Section>

					{/* External Factors */}
					<Section
						title="External Factors"
						open={sections.external}
						onToggle={() => toggleSection('external')}
					>
						<Field label="Salary / Financial State">
							<Input
								value={form.external_factors.salary}
								onChange={(v) =>
									setField('external_factors.salary', v)
								}
								placeholder="$120,000 / year"
							/>
						</Field>
						<Field label="Work Environment">
							<Input
								value={form.external_factors.work_environment}
								onChange={(v) =>
									setField(
										'external_factors.work_environment',
										v,
									)
								}
								placeholder="Hybrid, remote, in-office…"
							/>
						</Field>
						<Field label="Market Exposure">
							<Input
								value={form.external_factors.market_exposure}
								onChange={(v) =>
									setField(
										'external_factors.market_exposure',
										v,
									)
								}
								placeholder="Relevant if customer persona"
							/>
						</Field>
					</Section>

					{/* Footer */}
					<div
						style={{
							display: 'flex',
							justifyContent: 'flex-end',
							gap: '0.5rem',
							marginTop: '1rem',
						}}
					>
						<button
							type="button"
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
							type="submit"
							disabled={saving}
							style={{
								padding: '0.6rem 1.4rem',
								background: 'var(--accent-color)',
								color: '#fff',
								border: 'none',
								borderRadius: '8px',
								fontSize: '0.85rem',
								fontWeight: 600,
								cursor: saving ? 'wait' : 'pointer',
								opacity: saving ? 0.7 : 1,
							}}
						>
							{saving
								? 'Saving…'
								: initialData
									? 'Save Changes'
									: 'Create Agent'}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
