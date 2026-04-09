import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
	Activity,
	ArrowRight,
	Brain,
	Building2,
	CheckCircle2,
	GitBranch,
	Megaphone,
	Network,
	Settings,
	Target,
	TrendingUp,
	Users,
	Zap,
} from 'lucide-react';
import { waitlist } from '../api';

const WAITLIST_MAX_ATTEMPTS = 3;
const WAITLIST_WINDOW_MS = 60_000;

const SAMPLE_REPORTS = [
	{
		id: 'saas-pricing',
		icon: TrendingUp,
		label: 'Pricing Change',
		context: 'B2B SaaS · +25% price increase',
		goal: 'Understand churn risk and segment-level reaction before rolling out a pricing change.',
		impact: [
			{ label: 'Overall churn estimate', value: '18–26%', level: 'warn' },
			{
				label: 'High-risk segment',
				value: 'Small teams',
				level: 'danger',
			},
			{
				label: 'Short-term revenue',
				value: 'Spike likely',
				level: 'neutral',
			},
		],
		segments: [
			{
				name: 'Small Teams',
				reaction: 'Strong negative',
				reactionLevel: 'negative',
				stat: '35–45%',
				statLabel: 'churn risk',
				note: '"Not worth the price anymore" — likely to cancel or downgrade immediately.',
			},
			{
				name: 'Mid-size Companies',
				reaction: 'Mixed',
				reactionLevel: 'mixed',
				stat: '15–20%',
				statLabel: 'churn risk',
				note: 'Delaying decisions, evaluating alternatives before committing.',
			},
			{
				name: 'Enterprise',
				reaction: 'Mostly neutral',
				reactionLevel: 'neutral',
				stat: '5–8%',
				statLabel: 'churn risk',
				note: 'Contract renegotiation expected — low churn due to high switching costs.',
			},
		],
		recs: [
			'Introduce grandfathered pricing for existing users',
			'Pair price increase with visible feature upgrades',
			'Communicate clear reasoning — costs, roadmap, value',
			'Offer annual discount lock-ins to reduce churn incentive',
		],
	},
	{
		id: 'feature-launch',
		icon: Zap,
		label: 'Feature Launch',
		context: 'Social app · Algorithmic feed rollout',
		goal: 'Predict user backlash and net engagement impact from switching to an algorithmic feed.',
		impact: [
			{ label: 'Engagement change', value: '+12%', level: 'ok' },
			{
				label: 'Negative sentiment spike',
				value: '+40%',
				level: 'danger',
			},
			{ label: 'Stabilization', value: '~3–4 weeks', level: 'neutral' },
		],
		segments: [
			{
				name: 'Power Users',
				reaction: 'Highly negative',
				reactionLevel: 'negative',
				stat: 'High',
				statLabel: 'backlash risk',
				note: 'Vocal complaints, social media backlash. Risk of influencing casual users.',
			},
			{
				name: 'Casual Users',
				reaction: 'Neutral to positive',
				reactionLevel: 'positive',
				stat: '+scrolling',
				statLabel: 'engagement',
				note: 'Increased session time — core driver of the engagement uplift.',
			},
			{
				name: 'New Users',
				reaction: 'Positive',
				reactionLevel: 'positive',
				stat: 'Higher',
				statLabel: 'retention',
				note: 'Better onboarding experience improves first-week retention.',
			},
		],
		recs: [
			'Roll out as an optional toggle before full replacement',
			'Message it as "improved discovery", not a replacement',
			'Engage power users early through a private beta group',
			'Monitor social channels aggressively in the first 72 hours',
		],
	},
	{
		id: 'return-to-office',
		icon: Building2,
		label: 'Return to Office',
		context: '300-person startup · Mandatory RTO, 3 days/week',
		goal: 'Predict employee reaction and attrition risk from a mandatory return-to-office policy.',
		impact: [
			{ label: 'Attrition risk', value: '12–18%', level: 'warn' },
			{ label: 'Over', value: '3 months', level: 'neutral' },
			{ label: 'Morale impact', value: 'Significant', level: 'danger' },
		],
		segments: [
			{
				name: 'Fully Remote',
				reaction: 'Strong negative',
				reactionLevel: 'negative',
				stat: '25–35%',
				statLabel: 'attrition risk',
				note: 'Immediate job search behavior expected. Highest-risk group.',
			},
			{
				name: 'Hybrid Workers',
				reaction: 'Mild resistance',
				reactionLevel: 'mixed',
				stat: '10–15%',
				statLabel: 'attrition risk',
				note: 'Reluctant compliance likely — morale dip but lower churn.',
			},
			{
				name: 'In-office Workers',
				reaction: 'Neutral to positive',
				reactionLevel: 'positive',
				stat: '<5%',
				statLabel: 'attrition risk',
				note: 'Minimal behavior change — may benefit from increased team presence.',
			},
		],
		recs: [
			'Provide flexibility exceptions for high-performers and caregivers',
			'Offer commute support and in-office incentives',
			'Frame the policy as collaboration-driven, not control',
			'Roll out team-by-team rather than company-wide',
		],
	},
	{
		id: 'marketing-campaign',
		icon: Megaphone,
		label: 'Marketing Campaign',
		context: 'D2C brand · Bold, edgy ad campaign',
		goal: 'Predict conversion uplift vs. backlash risk from a polarizing campaign before launch.',
		impact: [
			{ label: 'Conversion lift', value: '+8–15%', level: 'ok' },
			{ label: 'Negative sentiment', value: '+20%', level: 'warn' },
			{ label: 'Reach effect', value: 'Polarizing', level: 'neutral' },
		],
		segments: [
			{
				name: 'Younger (18–30)',
				reaction: 'Positive',
				reactionLevel: 'positive',
				stat: 'High',
				statLabel: 'share rate',
				note: 'Shares and engagement spike — strongest conversion driver.',
			},
			{
				name: 'Older (30+)',
				reaction: 'Mixed to negative',
				reactionLevel: 'mixed',
				stat: 'Reduced',
				statLabel: 'brand trust',
				note: 'Criticism and reduced trust — risk of losing existing customers.',
			},
		],
		recs: [
			'Target the campaign to specific segments, not broad audiences',
			'Avoid wide ad exposure in the early rollout phase',
			'Prepare a PR response strategy before launch',
			'A/B test with a softer variant for 30+ audiences',
		],
	},
];

export default function Landing() {
	const [email, setEmail] = useState('');
	const [submitted, setSubmitted] = useState(false);
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);
	const [activeReport, setActiveReport] = useState(0);

	const handleSubmit = async (event) => {
		event.preventDefault();
		const trimmedEmail = email.trim().toLowerCase();

		if (!trimmedEmail) {
			setError('Enter an email address to join the waitlist.');
			return;
		}

		const now = Date.now();
		const raw = JSON.parse(
			localStorage.getItem('thallus.waitlist.attempts') || '[]',
		);
		const recentAttempts = raw.filter((t) => now - t < WAITLIST_WINDOW_MS);
		if (recentAttempts.length >= WAITLIST_MAX_ATTEMPTS) {
			const oldestInWindow = Math.min(...recentAttempts);
			const remainingSecs = Math.ceil(
				(WAITLIST_WINDOW_MS - (now - oldestInWindow)) / 1000,
			);
			setError(
				`Too many attempts. Please wait ${remainingSecs}s before trying again.`,
			);
			return;
		}

		setLoading(true);
		setError('');

		localStorage.setItem(
			'thallus.waitlist.attempts',
			JSON.stringify([...recentAttempts, now]),
		);

		try {
			await waitlist.join(trimmedEmail);
			setSubmitted(true);
			setEmail('');
		} catch (err) {
			const detail = err?.response?.data?.detail;
			if (err?.response?.status === 429) {
				setError('Too many requests. Please try again later.');
			} else if (err?.response?.status === 409) {
				setError('This email is already on the waitlist.');
			} else {
				setError(
					detail ||
						'Unable to save your request right now. Try again shortly.',
				);
			}
			setSubmitted(false);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="landing-page">
			<div className="landing-orb landing-orb-left" />
			<div className="landing-orb landing-orb-right" />
			<section className="landing-shell">
				{/* ── Topbar ── */}
				<div className="landing-topbar">
					<div className="landing-brandmark">
						<div className="landing-brandmark-icon">
							<Settings size={20} />
						</div>
						<div>
							<p className="landing-brandmark-name">Thallus</p>
							<p className="landing-brandmark-subtitle">
								Decision Intelligence
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

				{/* ── Hero ── */}
				<div className="landing-hero-grid">
					<div className="landing-copy">
						<p className="landing-kicker">
							AI Decision Intelligence
						</p>
						<h1 className="landing-title">
							Simulate how ideas spread before they happen.
						</h1>
						<p className="landing-description">
							Thallus models how narratives evolve, how people
							react, and how outcomes emerge. Run AI-driven social
							simulations grounded in your data to anticipate
							behavior, test scenarios, and make decisions with
							foresight.
						</p>
						<p className="landing-subline">
							Stress-test reality before it unfolds.
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
					</div>

					<div className="landing-panel">
						<p className="landing-panel-label">
							Simulation capabilities
						</p>
						<div className="landing-capability-list">
							<div className="landing-capability-card">
								<div className="landing-capability-icon">
									<Network size={18} />
								</div>
								<div>
									<h2>Narrative propagation</h2>
									<p>
										Model how ideas, policies, and messages
										spread across a population of AI
										personas.
									</p>
								</div>
							</div>
							<div className="landing-capability-card">
								<div className="landing-capability-icon">
									<Users size={18} />
								</div>
								<div>
									<h2>Behavioral personas</h2>
									<p>
										Generate realistic agents grounded in
										context — each with distinct biases and
										reactions.
									</p>
								</div>
							</div>
							<div className="landing-capability-card">
								<div className="landing-capability-icon">
									<Brain size={18} />
								</div>
								<div>
									<h2>Multi-round dynamics</h2>
									<p>
										Run iterative social interactions to
										observe how group behavior evolves over
										time.
									</p>
								</div>
							</div>
						</div>

						<div className="landing-trust-row">
							<div>
								<span className="landing-trust-number">
									Narrative-first
								</span>
								<p>Track how ideas form, spread, and mutate</p>
							</div>
							<div>
								<span className="landing-trust-number">
									Behavioral modeling
								</span>
								<p>
									Simulate individuals and their interactions
								</p>
							</div>
						</div>
					</div>
				</div>

				{/* ── What Thallus Does ── */}
				<div className="landing-section">
					<p className="landing-contrast-statement">
						Most tools analyze what already happened <br />
						<strong>
							Thallus simulates what could happen next
						</strong>
					</p>
					<div className="landing-pillars-grid">
						<div className="landing-pillar">
							<div className="landing-pillar-icon">
								<Network size={16} />
							</div>
							<div>
								<h3>Model narrative spread</h3>
								<p>
									Trace how stories travel across populations
									and transform as they move.
								</p>
							</div>
						</div>
						<div className="landing-pillar">
							<div className="landing-pillar-icon">
								<Users size={16} />
							</div>
							<div>
								<h3>Observe persona dynamics</h3>
								<p>
									Watch how different agents react to the same
									information and influence each other.
								</p>
							</div>
						</div>
						<div className="landing-pillar">
							<div className="landing-pillar-icon">
								<Target size={16} />
							</div>
							<div>
								<h3>Test decisions first</h3>
								<p>
									Deploy a policy, message, or product in
									simulation before the real world.
								</p>
							</div>
						</div>
					</div>
				</div>

				{/* ── Sample Reports ── */}
				<div className="landing-section">
					<div className="landing-section-header">
						<p className="landing-panel-label">Sample reports</p>
						<h2>Four scenarios. Real outputs.</h2>
						<p>
							These examples show what Thallus surfaces when you
							run a simulation — segment reactions, behavioral
							predictions, and actionable recommendations.
						</p>
					</div>
					<div className="landing-reports-tabs">
						{SAMPLE_REPORTS.map((r, i) => (
							<button
								key={r.id}
								className={`landing-report-tab${
									activeReport === i ? ' active' : ''
								}`}
								onClick={() => setActiveReport(i)}
							>
								<r.icon size={14} />
								{r.label}
							</button>
						))}
					</div>
					{(() => {
						const r = SAMPLE_REPORTS[activeReport];
						return (
							<div className="landing-report-body">
								<div className="landing-report-overview">
									<p className="landing-report-context">
										{r.context}
									</p>
									<p className="landing-report-goal">
										{r.goal}
									</p>
									<div className="landing-report-impact">
										{r.impact.map((stat) => (
											<div
												key={stat.label}
												className={`landing-report-stat landing-report-stat-${
													stat.level
												}`}
											>
												<span className="landing-report-stat-value">
													{stat.value}
												</span>
												<span className="landing-report-stat-label">
													{stat.label}
												</span>
											</div>
										))}
									</div>
									<div className="landing-report-recs">
										<p className="landing-report-recs-title">
											Recommendations
										</p>
										<ol>
											{r.recs.map((rec) => (
												<li key={rec}>{rec}</li>
											))}
										</ol>
									</div>
								</div>
								<div className="landing-report-segments">
									{r.segments.map((seg) => (
										<div
											key={seg.name}
											className="landing-report-segment"
										>
											<div className="landing-report-segment-header">
												<span className="landing-report-segment-name">
													{seg.name}
												</span>
												<span
													className={`landing-report-reaction landing-report-reaction-${
														seg.reactionLevel
													}`}
												>
													{seg.reaction}
												</span>
											</div>
											<div className="landing-report-segment-stat">
												<span className="landing-report-segment-stat-value">
													{seg.stat}
												</span>
												<span className="landing-report-segment-stat-label">
													{seg.statLabel}
												</span>
											</div>
											<p className="landing-report-segment-note">
												{seg.note}
											</p>
										</div>
									))}
								</div>
							</div>
						);
					})()}
				</div>

				{/* ── Two Ways to Use ── */}
				<div className="landing-section">
					<div className="landing-section-header">
						<p className="landing-panel-label">
							Two ways to use Thallus
						</p>
						<h2>Automated or controlled. You choose the depth.</h2>
					</div>
					<div className="landing-modes-grid">
						<div className="landing-mode-card">
							<div className="landing-mode-header">
								<div className="landing-mode-number">1</div>
								<h3>Automated Simulations</h3>
							</div>
							<p>
								Turn raw information into a living, evolving
								system. Upload reports, news, or internal
								documents and Thallus builds a full digital
								ecosystem that simulates how ideas propagate
								through it.
							</p>
							<ul className="landing-mode-features">
								{[
									'Auto-builds knowledge graphs from your data',
									'Generates realistic AI personas grounded in context',
									'Runs multi-round social interactions at scale',
									'Produces structured insights and reports',
								].map((f) => (
									<li key={f}>
										<CheckCircle2 size={14} />
										{f}
									</li>
								))}
							</ul>
						</div>
						<div className="landing-mode-card">
							<div className="landing-mode-header">
								<div className="landing-mode-number">2</div>
								<h3>Small World(s)</h3>
							</div>
							<p>
								Design controlled environments for precision
								testing. Create custom agents and worlds to test
								specific scenarios with exact initial
								conditions.
							</p>
							<ul className="landing-mode-features">
								{[
									'Define exact personas, biases, and behaviors',
									'Control the environment and initial conditions',
									'Run targeted simulations for specific use cases',
									'Branch scenarios and compare outcomes',
								].map((f) => (
									<li key={f}>
										<CheckCircle2 size={14} />
										{f}
									</li>
								))}
							</ul>
						</div>
					</div>
				</div>

				{/* ── What You Can Do ── */}
				<div className="landing-section">
					<div className="landing-section-header">
						<p className="landing-panel-label">Use cases</p>
						<h2>What you can do with it</h2>
					</div>
					<div className="landing-usecases-grid">
						{[
							'Test how a narrative, policy, or product will be received',
							'Simulate PR crises before they happen',
							'Understand how different groups react to the same information',
							'Explore "what if" scenarios with controlled variables',
							'Turn unstructured data into behavioral insight',
							'Model adoption curves for new ideas or initiatives',
						].map((uc) => (
							<div
								key={uc}
								className="landing-usecase-item"
							>
								<ArrowRight size={14} />
								{uc}
							</div>
						))}
					</div>
				</div>

				{/* ── How It Works ── */}
				<div className="landing-section">
					<div className="landing-section-header">
						<p className="landing-panel-label">How it works</p>
						<h2>Four steps from input to insight</h2>
					</div>
					<div className="landing-how-grid">
						{[
							{
								n: '01',
								title: 'Input your world',
								desc: 'Upload documents or define a custom environment to ground the simulation.',
							},
							{
								n: '02',
								title: 'Generate the ecosystem',
								desc: 'Thallus builds agents, relationships, and narratives automatically from your inputs.',
							},
							{
								n: '03',
								title: 'Run the simulation',
								desc: 'Agents interact, debate, and evolve across multiple rounds of social dynamics.',
							},
							{
								n: '04',
								title: 'Analyze outcomes',
								desc: 'Query results, explore insights, and understand what changed and why.',
							},
						].map((s) => (
							<div
								key={s.n}
								className="landing-step"
							>
								<div className="landing-step-num">{s.n}</div>
								<h3>{s.title}</h3>
								<p>{s.desc}</p>
							</div>
						))}
					</div>
				</div>

				{/* ── Deep Analysis ── */}
				<div className="landing-section">
					<div className="landing-section-header">
						<p className="landing-panel-label">Deep analysis</p>
						<h2>Not just output — structured intelligence</h2>
					</div>
					<div className="landing-analysis-grid">
						<div className="landing-analysis-card">
							<div className="landing-analysis-card-icon">
								<Brain size={20} />
							</div>
							<h3>Multi-Agent Insight Engine</h3>
							<p>
								Go beyond metrics with structured AI debate
								across competing perspectives.
							</p>
							<ul className="landing-analysis-list">
								<li>
									Agents analyze outcomes from multiple
									perspectives
								</li>
								<li>Competing interpretations are debated</li>
								<li>
									Conclusions emerge from consensus, not a
									single pass
								</li>
							</ul>
						</div>
						<div className="landing-analysis-card">
							<div className="landing-analysis-card-icon">
								<GitBranch size={20} />
							</div>
							<h3>Scenario Comparison</h3>
							<p>
								Understand exactly what changed between
								simulation runs.
							</p>
							<ul className="landing-analysis-list">
								<li>
									Compare two simulation runs side by side
								</li>
								<li>Identify where outcomes diverged</li>
								<li>
									Track shifts in behavior, adoption, and
									sentiment
								</li>
								<li>
									Clear explanations of why the system changed
								</li>
							</ul>
						</div>
						<div className="landing-analysis-card">
							<div className="landing-analysis-card-icon">
								<Activity size={20} />
							</div>
							<h3>Visual Intelligence Layer</h3>
							<p>
								See your simulation&#39;s dynamics at a glance.
							</p>
							<ul className="landing-analysis-list">
								<li>Narrative evolution over time</li>
								<li>
									Concept co-occurrence and idea clustering
								</li>
								<li>System-wide behavioral trends</li>
								<li>
									Simulation health and stability diagnostics
								</li>
							</ul>
						</div>
					</div>
				</div>

				{/* ── When + Why ── */}
				<div className="landing-when-why-grid">
					<div className="landing-section">
						<p className="landing-panel-label">When to use it</p>
						<h2 className="landing-section-h2">
							When teams use Thallus
						</h2>
						<ul className="landing-when-list">
							{[
								'Before launching a high-stakes initiative',
								'When decisions depend on human behavior',
								'When data is messy but consequences are real',
								'When multiple perspectives need to be explored, not averaged',
								'When you need to understand systems, not just outputs',
							].map((w) => (
								<li key={w}>
									<CheckCircle2 size={14} />
									{w}
								</li>
							))}
						</ul>
					</div>
					<div className="landing-section">
						<p className="landing-panel-label">Why this matters</p>
						<h2 className="landing-section-h2">
							Real-world systems are complex by nature
						</h2>
						<p className="landing-why-copy">
							They are non-linear, socially driven, and hard to
							predict. Thallus turns them into something you can
							simulate, observe, and learn from
						</p>
						<div className="landing-system-traits">
							<div className="landing-trait">
								<div className="landing-trait-value">
									Non-linear
								</div>
								<div className="landing-trait-label">
									Small inputs can have outsized effects
								</div>
							</div>
							<div className="landing-trait">
								<div className="landing-trait-value">
									Social
								</div>
								<div className="landing-trait-label">
									Decisions are made by people, not averages
								</div>
							</div>
							<div className="landing-trait">
								<div className="landing-trait-value">
									Emergent
								</div>
								<div className="landing-trait-label">
									Outcomes arise from interaction, not intent
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* ── CTA ── */}
				<div className="landing-section landing-cta-section">
					<h2>If you could test reality before acting, would you?</h2>
					<p>
						Thallus gives you a sandbox to explore outcomes before
						they matter
					</p>
					<div className="landing-actions landing-actions-centered">
						<a
							href="#waitlist"
							className="btn landing-primary-cta"
						>
							Join the waitlist
							<ArrowRight size={16} />
						</a>
					</div>
				</div>

				{/* ── Waitlist ── */}
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
								<span>Access to simulation workflows</span>
							</div>
							<div>
								<CheckCircle2 size={16} />
								<span>Priority onboarding</span>
							</div>
						</div>
					</div>

					<form
						onSubmit={handleSubmit}
						className="landing-waitlist-form"
					>
						<label htmlFor="waitlist-email">Email</label>
						<input
							id="waitlist-email"
							type="email"
							value={email}
							onChange={(event) => setEmail(event.target.value)}
							placeholder="you@email.com"
							required
						/>
						<button
							type="submit"
							className="btn landing-submit"
							disabled={loading}
						>
							{loading ? 'Joining…' : 'Join waitlist'}
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

				{/* ── Footer ── */}
				<footer className="landing-footer">
					<p className="landing-footer-brand">Thallus</p>
					<p>
						AI Decision Intelligence for Social Dynamics and
						Decision Intelligence
					</p>
				</footer>
				<p className="landing-footer-contact">
					<a href="mailto:angelmacwan@staticalabs.com">
						Contact via email
					</a>
				</p>
			</section>
		</div>
	);
}
