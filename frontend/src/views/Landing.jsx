import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
	ArrowRight,
	CheckCircle2,
	FileText,
	Settings,
	Sparkles,
	Users,
} from 'lucide-react';

const capabilityItems = [
	{
		title: 'Run multi-agent simulations',
		description:
			'Spin up structured deliberation across multiple AI perspectives instead of relying on a single response.',
		icon: Users,
	},
	{
		title: 'Turn source material into insight',
		description:
			'Upload briefs, reports, or notes and generate clearer findings, tensions, and emerging patterns.',
		icon: FileText,
	},
	{
		title: 'Produce decision-ready outputs',
		description:
			'Capture reports and synthesis that help teams move from raw inputs to a defensible point of view.',
		icon: Sparkles,
	},
];

export default function Landing() {
	const [email, setEmail] = useState('');
	const [submitted, setSubmitted] = useState(false);
	const [error, setError] = useState('');

	const handleSubmit = (event) => {
		event.preventDefault();
		const trimmedEmail = email.trim().toLowerCase();

		if (!trimmedEmail) {
			setError('Enter an email address to join the waitlist.');
			setSubmitted(false);
			return;
		}

		try {
			const existingEntries = JSON.parse(
				localStorage.getItem('thallus.waitlist') || '[]',
			);
			const nextEntries = Array.isArray(existingEntries)
				? existingEntries
				: [];
			if (!nextEntries.includes(trimmedEmail)) {
				nextEntries.push(trimmedEmail);
				localStorage.setItem(
					'thallus.waitlist',
					JSON.stringify(nextEntries),
				);
			}
			setError('');
			setSubmitted(true);
			setEmail('');
		} catch {
			setError(
				'Unable to save your request right now. Try again shortly.',
			);
			setSubmitted(false);
		}
	};

	return (
		<div className="landing-page">
			<div className="landing-orb landing-orb-left" />
			<div className="landing-orb landing-orb-right" />
			<section className="landing-shell">
				<div className="landing-topbar">
					<div className="landing-brandmark">
						<div className="landing-brandmark-icon">
							<Settings size={20} />
						</div>
						<div>
							<p className="landing-brandmark-name">Thallus</p>
							<p className="landing-brandmark-subtitle">
								Simulation Engine
							</p>
						</div>
					</div>
					<Link
						to="/login"
						className="landing-login-link"
					>
						Sign in
					</Link>
				</div>

				<div className="landing-hero-grid">
					<div className="landing-copy">
						<p className="landing-kicker">
							Strategic AI deliberation
						</p>
						<h1 className="landing-title">
							Run complex questions through teams of AI agents.
						</h1>
						<p className="landing-description">
							Thallus helps teams explore scenarios, pressure-test
							assumptions, and turn source material into
							structured reports. It is built for work that needs
							more than a single answer.
						</p>
						<div className="landing-actions">
							<a
								href="#waitlist"
								className="btn landing-primary-cta"
							>
								Join the waitlist
								<ArrowRight size={16} />
							</a>
							<Link
								to="/login"
								className="btn btn-secondary landing-secondary-cta"
							>
								Open app
							</Link>
						</div>
						<div className="landing-trust-row">
							<div>
								<span className="landing-trust-number">
									Multi-agent
								</span>
								<p>Deliberation across distinct perspectives</p>
							</div>
							<div>
								<span className="landing-trust-number">
									Document-first
								</span>
								<p>
									Built around the material your team already
									has
								</p>
							</div>
						</div>
					</div>

					<div className="landing-panel">
						<p className="landing-panel-label">Capabilities</p>
						<div className="landing-capability-list">
							{capabilityItems.map(
								({ title, description, icon: Icon }) => (
									<div
										key={title}
										className="landing-capability-card"
									>
										<div className="landing-capability-icon">
											<Icon size={18} />
										</div>
										<div>
											<h2>{title}</h2>
											<p>{description}</p>
										</div>
									</div>
								),
							)}
						</div>
					</div>
				</div>

				<section
					id="waitlist"
					className="landing-waitlist"
				>
					<div>
						<p className="landing-panel-label">Waitlist</p>
						<h2>Request early access</h2>
						<p className="landing-waitlist-copy">
							Leave your email and we will reach out when access
							opens.
						</p>
						<div className="landing-benefits">
							<div>
								<CheckCircle2 size={16} />
								<span>Early product updates</span>
							</div>
							<div>
								<CheckCircle2 size={16} />
								<span>
									First access to new simulation workflows
								</span>
							</div>
						</div>
					</div>

					<form
						onSubmit={handleSubmit}
						className="landing-waitlist-form"
					>
						<label htmlFor="waitlist-email">Work email</label>
						<input
							id="waitlist-email"
							type="email"
							value={email}
							onChange={(event) => setEmail(event.target.value)}
							placeholder="you@company.com"
							required
						/>
						<button
							type="submit"
							className="btn landing-submit"
						>
							Join waitlist
						</button>
						{submitted && !error && (
							<p className="landing-form-status landing-form-status-success">
								You are on the list. We will be in touch.
							</p>
						)}
						{error && (
							<p className="landing-form-status landing-form-status-error">
								{error}
							</p>
						)}
					</form>
				</section>
			</section>
		</div>
	);
}
