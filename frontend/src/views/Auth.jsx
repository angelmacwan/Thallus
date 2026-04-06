import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
	ArrowLeft,
	CheckCircle2,
	Settings,
	ShieldCheck,
	Sparkles,
} from 'lucide-react';
import api from '../api';

const authHighlights = [
	'Run document-backed simulations with distinct agent perspectives.',
	'Keep reports, sessions, and insights in one workspace.',
	'Use structured outputs built for strategy, research, and analysis.',
];

export default function Auth() {
	const [isLogin, setIsLogin] = useState(true);
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [statusMessage, setStatusMessage] = useState('');
	const [statusTone, setStatusTone] = useState('idle');
	const [isSubmitting, setIsSubmitting] = useState(false);
	const navigate = useNavigate();

	const handleSubmit = async (e) => {
		e.preventDefault();
		setStatusMessage('');
		setStatusTone('idle');

		setIsSubmitting(true);
		try {
			if (isLogin) {
				const formData = new URLSearchParams();
				formData.append('username', email);
				formData.append('password', password);
				const res = await api.post('/auth/login', formData, {
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded',
					},
				});
				localStorage.setItem('token', res.data.access_token);
				navigate('/');
			} else {
				await api.post('/auth/register', { email, password });
				setIsLogin(true);
				setPassword('');
				setStatusTone('success');
				setStatusMessage('Account created. Sign in to continue.');
			}
		} catch (err) {
			const status = err.response?.status;
			const detail =
				err.response?.data?.detail ||
				'An error occurred. Please try again.';
			if (status === 403) {
				setStatusTone('warning');
			} else {
				setStatusTone('error');
			}
			setStatusMessage(detail);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="auth-page fade-in">
			<div className="landing-orb landing-orb-left" />
			<div className="landing-orb landing-orb-right" />
			<section className="auth-shell">
				<Link
					to="/"
					className="auth-back-link"
				>
					<ArrowLeft size={16} />
					Back to overview
				</Link>

				<div className="auth-layout">
					<section className="auth-panel auth-story-panel">
						<div className="landing-brandmark auth-brandmark">
							<div className="landing-brandmark-icon">
								<Settings size={20} />
							</div>
							<div>
								<p className="landing-brandmark-name">
									Thallus
								</p>
								<p className="landing-brandmark-subtitle">
									Simulation Engine
								</p>
							</div>
						</div>

						<p className="landing-kicker auth-kicker">
							Strategic AI workspace
						</p>
						<h1 className="auth-title">
							{isLogin
								? 'Return to your simulation command center.'
								: 'Create a workspace for multi-agent reasoning.'}
						</h1>
						<p className="auth-description">
							Thallus is built for teams working through ambiguity
							with documents, scenarios, and structured reports
							instead of a single raw model output.
						</p>

						<div className="auth-highlight-list">
							{authHighlights.map((item) => (
								<div
									key={item}
									className="auth-highlight-item"
								>
									<CheckCircle2 size={18} />
									<span>{item}</span>
								</div>
							))}
						</div>

						<div className="auth-metrics-row">
							<div>
								<ShieldCheck size={18} />
								<div>
									<p>Structured access</p>
									<span>
										Account-based entry to reports and
										sessions
									</span>
								</div>
							</div>
							<div>
								<Sparkles size={18} />
								<div>
									<p>Deliberate faster</p>
									<span>
										Move from source material to defensible
										outputs
									</span>
								</div>
							</div>
						</div>
					</section>

					<section className="auth-panel auth-form-panel">
						<div className="auth-mode-switch">
							<button
								type="button"
								className={`auth-mode-button ${isLogin ? 'active' : ''}`}
								onClick={() => {
									setIsLogin(true);
									setStatusMessage('');
									setStatusTone('idle');
								}}
							>
								Sign in
							</button>
							<button
								type="button"
								className={`auth-mode-button ${!isLogin ? 'active' : ''}`}
								onClick={() => {
									setIsLogin(false);
									setStatusMessage('');
									setStatusTone('idle');
								}}
							>
								Create account
							</button>
						</div>

						<div className="auth-form-header">
							<p className="landing-panel-label">
								{isLogin ? 'Welcome back' : 'Get started'}
							</p>
							<h2>
								{isLogin
									? 'Sign in to continue'
									: 'Create your account'}
							</h2>
							<p>
								{isLogin
									? 'Access your simulations, reports, and saved sessions.'
									: 'Set up an account to start building scenario and document workflows.'}
							</p>
						</div>

						{statusMessage && (
							<div
								className={`auth-status auth-status-${statusTone}`}
							>
								{statusTone === 'warning' && (
									<p className="auth-status-label">
										Unauthorised
									</p>
								)}
								<p>{statusMessage}</p>
							</div>
						)}

						<form
							onSubmit={handleSubmit}
							className="auth-form"
						>
							<div className="form-group auth-form-group">
								<label
									className="form-label"
									htmlFor="auth-email"
								>
									Email
								</label>
								<input
									id="auth-email"
									type="email"
									className="input-field auth-input"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									placeholder="you@email.com"
									autoComplete="email"
									required
								/>
							</div>
							<div className="form-group auth-form-group">
								<label
									className="form-label"
									htmlFor="auth-password"
								>
									Password
								</label>
								<div className="auth-password-wrap">
									<input
										id="auth-password"
										type="password"
										className="input-field auth-input auth-input-password"
										value={password}
										onChange={(e) =>
											setPassword(e.target.value)
										}
										placeholder={
											isLogin
												? 'Enter your password'
												: 'Create a secure password'
										}
										autoComplete={
											isLogin
												? 'current-password'
												: 'new-password'
										}
										required
									/>
								</div>
							</div>

							<button
								type="submit"
								className="btn auth-submit"
								disabled={isSubmitting}
							>
								{isSubmitting
									? 'Please wait...'
									: isLogin
										? 'Sign in'
										: 'Create account'}
							</button>
						</form>

						<p className="auth-footnote">
							{isLogin
								? "Don't have an account?"
								: 'Already set up?'}
							<button
								type="button"
								className="auth-inline-toggle"
								onClick={() => {
									setIsLogin(!isLogin);
									setStatusMessage('');
									setStatusTone('idle');
									setPassword('');
								}}
							>
								{isLogin ? 'Create one' : 'Sign in instead'}
							</button>
						</p>
					</section>
				</div>
			</section>
		</div>
	);
}
