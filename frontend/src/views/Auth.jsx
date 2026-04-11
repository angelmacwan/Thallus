import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
	ArrowLeft,
	CheckCircle2,
	Settings,
	ShieldCheck,
	Sparkles,
} from 'lucide-react';
import api, { authApi } from '../api';

const authHighlights = [
	'Run document-backed simulations with distinct agent perspectives.',
	'Keep reports, sessions, and insights in one workspace.',
	'Use structured outputs built for strategy, research, and analysis.',
];

// Possible steps:
//   "login"           — sign-in form
//   "register-email"  — email + password, request code
//   "register-otp"    — enter 6-digit code, create account
//   "forgot-email"    — enter email to receive reset code
//   "forgot-otp"      — enter code + new password

export default function Auth() {
	const [step, setStep] = useState('login');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [otp, setOtp] = useState('');
	const [newPassword, setNewPassword] = useState('');
	const [statusMessage, setStatusMessage] = useState('');
	const [statusTone, setStatusTone] = useState('idle');
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [resendCountdown, setResendCountdown] = useState(0);
	const countdownRef = useRef(null);
	const navigate = useNavigate();

	// Clear countdown timer on unmount
	useEffect(() => {
		return () => {
			if (countdownRef.current) clearInterval(countdownRef.current);
		};
	}, []);

	function startCountdown() {
		setResendCountdown(60);
		if (countdownRef.current) clearInterval(countdownRef.current);
		countdownRef.current = setInterval(() => {
			setResendCountdown((prev) => {
				if (prev <= 1) {
					clearInterval(countdownRef.current);
					return 0;
				}
				return prev - 1;
			});
		}, 1000);
	}

	function goToStep(newStep) {
		setStep(newStep);
		setStatusMessage('');
		setStatusTone('idle');
		setOtp('');
		setNewPassword('');
	}

	function setError(msg) {
		setStatusTone('error');
		setStatusMessage(msg);
	}

	function setSuccess(msg) {
		setStatusTone('success');
		setStatusMessage(msg);
	}

	// ── Login ────────────────────────────────────────────────────────────────
	async function handleLogin(e) {
		e.preventDefault();
		setStatusMessage('');
		setStatusTone('idle');
		setIsSubmitting(true);
		try {
			const formData = new URLSearchParams();
			formData.append('username', email.trim().toLowerCase());
			formData.append('password', password);
			const res = await api.post('/auth/login', formData, {
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
			});
			localStorage.setItem('token', res.data.access_token);
			navigate('/');
		} catch (err) {
			const detail =
				err.response?.data?.detail ||
				'An error occurred. Please try again.';
			setError(detail);
		} finally {
			setIsSubmitting(false);
		}
	}

	// ── Send signup OTP ──────────────────────────────────────────────────────
	async function handleSendSignupOtp(e) {
		e.preventDefault();
		setStatusMessage('');
		setStatusTone('idle');
		setIsSubmitting(true);
		try {
			await authApi.sendSignupOtp(email.trim().toLowerCase());
			startCountdown();
			goToStep('register-otp');
			setSuccess('Code sent — check your inbox.');
		} catch (err) {
			const status = err.response?.status;
			const detail =
				err.response?.data?.detail || 'Failed to send code. Try again.';
			if (status === 403) {
				setStatusTone('warning');
				setStatusMessage(detail);
			} else if (status === 409) {
				setError(
					'An account with this email already exists. Sign in instead.',
				);
			} else if (status === 429) {
				setError(detail);
			} else {
				setError(detail);
			}
		} finally {
			setIsSubmitting(false);
		}
	}

	// ── Resend OTP (signup or reset) ─────────────────────────────────────────
	async function handleResendOtp() {
		if (resendCountdown > 0) return;
		setStatusMessage('');
		setStatusTone('idle');
		setIsSubmitting(true);
		try {
			if (step === 'register-otp') {
				await authApi.sendSignupOtp(email.trim().toLowerCase());
			} else {
				await authApi.sendResetOtp(email.trim().toLowerCase());
			}
			startCountdown();
			setSuccess('A new code has been sent.');
		} catch (err) {
			const detail =
				err.response?.data?.detail || 'Failed to resend. Try again.';
			setError(detail);
		} finally {
			setIsSubmitting(false);
		}
	}

	// ── Create account ───────────────────────────────────────────────────────
	async function handleRegister(e) {
		e.preventDefault();
		setStatusMessage('');
		setStatusTone('idle');
		setIsSubmitting(true);
		try {
			await authApi.register(
				email.trim().toLowerCase(),
				password,
				otp.trim(),
			);
			goToStep('login');
			setSuccess('Account created. Sign in to continue.');
		} catch (err) {
			const status = err.response?.status;
			const detail =
				err.response?.data?.detail ||
				'An error occurred. Please try again.';
			if (status === 403) {
				setStatusTone('warning');
				setStatusMessage(detail);
			} else {
				setError(detail);
			}
		} finally {
			setIsSubmitting(false);
		}
	}

	// ── Send password reset OTP ──────────────────────────────────────────────
	async function handleSendResetOtp(e) {
		e.preventDefault();
		setStatusMessage('');
		setStatusTone('idle');
		setIsSubmitting(true);
		try {
			await authApi.sendResetOtp(email.trim().toLowerCase());
			startCountdown();
			goToStep('forgot-otp');
			setSuccess('If that email is registered, a code has been sent.');
		} catch (err) {
			const detail =
				err.response?.data?.detail || 'Failed to send code. Try again.';
			setError(detail);
		} finally {
			setIsSubmitting(false);
		}
	}

	// ── Reset password ───────────────────────────────────────────────────────
	async function handleResetPassword(e) {
		e.preventDefault();
		setStatusMessage('');
		setStatusTone('idle');
		setIsSubmitting(true);
		try {
			await authApi.resetPassword(
				email.trim().toLowerCase(),
				otp.trim(),
				newPassword,
			);
			goToStep('login');
			setSuccess('Password updated. Sign in with your new password.');
		} catch (err) {
			const detail =
				err.response?.data?.detail ||
				'An error occurred. Please try again.';
			setError(detail);
		} finally {
			setIsSubmitting(false);
		}
	}

	// ── Derived labels ────────────────────────────────────────────────────────
	const isRegisterFlow = step === 'register-email' || step === 'register-otp';
	const isForgotFlow = step === 'forgot-email' || step === 'forgot-otp';

	const panelTitle = {
		login: 'Return to your simulation command center.',
		'register-email': 'Create a workspace for multi-agent reasoning.',
		'register-otp': 'Create a workspace for multi-agent reasoning.',
		'forgot-email': 'Reset your password.',
		'forgot-otp': 'Reset your password.',
	}[step];

	const formHeader = {
		login: {
			kicker: 'Welcome back',
			heading: 'Sign in to continue',
			sub: 'Access your simulations, reports, and saved sessions.',
		},
		'register-email': {
			kicker: 'Get started',
			heading: 'Create your account',
			sub: 'Set up an account to start building scenario and document workflows.',
		},
		'register-otp': {
			kicker: 'Verify your email',
			heading: 'Enter the code',
			sub: `We sent a 6-digit code to ${email}. Enter it below to finish creating your account.`,
		},
		'forgot-email': {
			kicker: 'Password reset',
			heading: 'Forgot your password?',
			sub: 'Enter your account email and we will send a reset code.',
		},
		'forgot-otp': {
			kicker: 'Password reset',
			heading: 'Enter the reset code',
			sub: `We sent a 6-digit code to ${email}. Enter it below and choose a new password.`,
		},
	}[step];

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
					{/* ── Left story panel ─────────────────────────────── */}
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
									Decision Intelligence
								</p>
							</div>
						</div>

						<p className="landing-kicker auth-kicker">
							Strategic AI workspace
						</p>
						<h1 className="auth-title">{panelTitle}</h1>
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

					{/* ── Right form panel ─────────────────────────────── */}
					<section className="auth-panel auth-form-panel">
						{/* Mode switch tabs — only for login / register-email */}
						{(step === 'login' || step === 'register-email') && (
							<div className="auth-mode-switch">
								<button
									type="button"
									className={`auth-mode-button ${step === 'login' ? 'active' : ''}`}
									onClick={() => goToStep('login')}
								>
									Sign in
								</button>
								<button
									type="button"
									className={`auth-mode-button ${step === 'register-email' ? 'active' : ''}`}
									onClick={() => goToStep('register-email')}
								>
									Create account
								</button>
							</div>
						)}

						<div className="auth-form-header">
							<p className="landing-panel-label">
								{formHeader.kicker}
							</p>
							<h2>{formHeader.heading}</h2>
							<p>{formHeader.sub}</p>
						</div>

						{statusMessage && (
							<div
								className={`auth-status auth-status-${statusTone}`}
							>
								{statusTone === 'warning' && (
									<p className="auth-status-label">
										Invite only
									</p>
								)}
								<p>{statusMessage}</p>
								{statusTone === 'warning' && (
									<p
										style={{
											marginTop: '8px',
											fontSize: '13px',
										}}
									>
										<a
											href="/#waitlist"
											style={{
												color: 'inherit',
												textDecoration: 'underline',
												fontWeight: 600,
											}}
										>
											Request access on the waitlist →
										</a>
									</p>
								)}
							</div>
						)}

						{/* ── Login form ──────────────────────────────── */}
						{step === 'login' && (
							<form
								onSubmit={handleLogin}
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
										onChange={(e) =>
											setEmail(e.target.value)
										}
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
											placeholder="Enter your password"
											autoComplete="current-password"
											required
										/>
									</div>
								</div>
								<button
									type="button"
									className="auth-forgot-link"
									onClick={() => {
										setEmail('');
										goToStep('forgot-email');
									}}
								>
									Forgot password?
								</button>
								<button
									type="submit"
									className="btn auth-submit"
									disabled={isSubmitting}
								>
									{isSubmitting ? 'Signing in…' : 'Sign in'}
								</button>
							</form>
						)}

						{/* ── Register step 1: email + password ──────── */}
						{step === 'register-email' && (
							<form
								onSubmit={handleSendSignupOtp}
								className="auth-form"
							>
								<div className="form-group auth-form-group">
									<label
										className="form-label"
										htmlFor="reg-email"
									>
										Email
									</label>
									<input
										id="reg-email"
										type="email"
										className="input-field auth-input"
										value={email}
										onChange={(e) =>
											setEmail(e.target.value)
										}
										placeholder="you@email.com"
										autoComplete="email"
										required
									/>
								</div>
								<div className="form-group auth-form-group">
									<label
										className="form-label"
										htmlFor="reg-password"
									>
										Password
									</label>
									<div className="auth-password-wrap">
										<input
											id="reg-password"
											type="password"
											className="input-field auth-input auth-input-password"
											value={password}
											onChange={(e) =>
												setPassword(e.target.value)
											}
											placeholder="Create a secure password"
											autoComplete="new-password"
											minLength={8}
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
										? 'Sending code…'
										: 'Send verification code'}
								</button>
							</form>
						)}

						{/* ── Register step 2: enter OTP ─────────────── */}
						{step === 'register-otp' && (
							<form
								onSubmit={handleRegister}
								className="auth-form"
							>
								<div className="form-group auth-form-group">
									<label
										className="form-label"
										htmlFor="reg-otp"
									>
										Verification code
									</label>
									<input
										id="reg-otp"
										type="text"
										inputMode="numeric"
										className="input-field auth-input auth-otp-input"
										value={otp}
										onChange={(e) =>
											setOtp(
												e.target.value
													.replace(/\D/g, '')
													.slice(0, 6),
											)
										}
										placeholder="000000"
										maxLength={6}
										autoComplete="one-time-code"
										required
									/>
								</div>
								<button
									type="submit"
									className="btn auth-submit"
									disabled={isSubmitting || otp.length < 6}
								>
									{isSubmitting
										? 'Creating account…'
										: 'Create account'}
								</button>
								<div className="auth-resend-row">
									<button
										type="button"
										className="auth-inline-toggle"
										onClick={handleResendOtp}
										disabled={
											resendCountdown > 0 || isSubmitting
										}
									>
										{resendCountdown > 0
											? `Resend in ${resendCountdown}s`
											: 'Resend code'}
									</button>
									<span className="auth-resend-sep">·</span>
									<button
										type="button"
										className="auth-inline-toggle"
										onClick={() =>
											goToStep('register-email')
										}
									>
										Change email
									</button>
								</div>
							</form>
						)}

						{/* ── Forgot password step 1: enter email ─────── */}
						{step === 'forgot-email' && (
							<form
								onSubmit={handleSendResetOtp}
								className="auth-form"
							>
								<div className="form-group auth-form-group">
									<label
										className="form-label"
										htmlFor="forgot-email"
									>
										Account email
									</label>
									<input
										id="forgot-email"
										type="email"
										className="input-field auth-input"
										value={email}
										onChange={(e) =>
											setEmail(e.target.value)
										}
										placeholder="you@email.com"
										autoComplete="email"
										required
									/>
								</div>
								<button
									type="submit"
									className="btn auth-submit"
									disabled={isSubmitting}
								>
									{isSubmitting
										? 'Sending code…'
										: 'Send reset code'}
								</button>
								<p className="auth-footnote">
									Remembered it?
									<button
										type="button"
										className="auth-inline-toggle"
										onClick={() => goToStep('login')}
									>
										Back to sign in
									</button>
								</p>
							</form>
						)}

						{/* ── Forgot password step 2: OTP + new pass ──── */}
						{step === 'forgot-otp' && (
							<form
								onSubmit={handleResetPassword}
								className="auth-form"
							>
								<div className="form-group auth-form-group">
									<label
										className="form-label"
										htmlFor="reset-otp"
									>
										Reset code
									</label>
									<input
										id="reset-otp"
										type="text"
										inputMode="numeric"
										className="input-field auth-input auth-otp-input"
										value={otp}
										onChange={(e) =>
											setOtp(
												e.target.value
													.replace(/\D/g, '')
													.slice(0, 6),
											)
										}
										placeholder="000000"
										maxLength={6}
										autoComplete="one-time-code"
										required
									/>
								</div>
								<div className="form-group auth-form-group">
									<label
										className="form-label"
										htmlFor="reset-new-password"
									>
										New password
									</label>
									<div className="auth-password-wrap">
										<input
											id="reset-new-password"
											type="password"
											className="input-field auth-input auth-input-password"
											value={newPassword}
											onChange={(e) =>
												setNewPassword(e.target.value)
											}
											placeholder="Create a new password"
											autoComplete="new-password"
											minLength={8}
											required
										/>
									</div>
								</div>
								<button
									type="submit"
									className="btn auth-submit"
									disabled={isSubmitting || otp.length < 6}
								>
									{isSubmitting
										? 'Updating password…'
										: 'Reset password'}
								</button>
								<div className="auth-resend-row">
									<button
										type="button"
										className="auth-inline-toggle"
										onClick={handleResendOtp}
										disabled={
											resendCountdown > 0 || isSubmitting
										}
									>
										{resendCountdown > 0
											? `Resend in ${resendCountdown}s`
											: 'Resend code'}
									</button>
									<span className="auth-resend-sep">·</span>
									<button
										type="button"
										className="auth-inline-toggle"
										onClick={() => goToStep('forgot-email')}
									>
										Change email
									</button>
								</div>
							</form>
						)}

						{/* ── Footer footnote ─────────────────────────── */}
						{(step === 'login' || step === 'register-email') && (
							<p className="auth-footnote">
								{step === 'login'
									? "Don't have an account?"
									: 'Already set up?'}
								<button
									type="button"
									className="auth-inline-toggle"
									onClick={() =>
										goToStep(
											step === 'login'
												? 'register-email'
												: 'login',
										)
									}
								>
									{step === 'login'
										? 'Create one'
										: 'Sign in instead'}
								</button>
							</p>
						)}
					</section>
				</div>
			</section>
		</div>
	);
}
