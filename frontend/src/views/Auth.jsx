import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
	ArrowLeft,
	CheckCircle2,
	Settings,
	ShieldCheck,
	Sparkles,
} from 'lucide-react';
import { authApi } from '../api';

const authHighlights = [
	'Run document-backed simulations with distinct agent perspectives.',
	'Keep reports, sessions, and insights in one workspace.',
	'Use structured outputs built for strategy, research, and analysis.',
];

// Steps: "email" → "otp"

export default function Auth() {
	const [step, setStep] = useState('email');
	const [email, setEmail] = useState('');
	const [otp, setOtp] = useState('');
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

	function setError(msg) {
		setStatusTone('error');
		setStatusMessage(msg);
	}

	function setSuccess(msg) {
		setStatusTone('success');
		setStatusMessage(msg);
	}

	// ── Step 1: send OTP ──────────────────────────────────────────────────────
	async function handleSendOtp(e) {
		e.preventDefault();
		setStatusMessage('');
		setStatusTone('idle');
		setIsSubmitting(true);
		try {
			await authApi.sendLoginOtp(email.trim().toLowerCase());
			startCountdown();
			setStep('otp');
			setSuccess('Code sent — check your inbox.');
		} catch (err) {
			const status = err.response?.status;
			const detail = err.response?.data?.detail;

			if (status === 403) {
				setStatusTone('warning');
				setStatusMessage(
					detail ||
						'Thallus is currently invite-only. Join the waitlist to request access.',
				);
			} else if (status === 429) {
				setError(
					detail ||
						'Too many requests. Please wait before trying again.',
				);
			} else if (err.code === 'ERR_NETWORK' || !err.response) {
				setError(
					'Unable to reach the server. Please check backend connection.',
				);
			} else {
				setError(detail || 'Failed to send code. Please try again.');
			}
		} finally {
			setIsSubmitting(false);
		}
	}

	// ── Step 2: verify OTP ────────────────────────────────────────────────────
	async function handleVerifyOtp(e) {
		e.preventDefault();
		setStatusMessage('');
		setStatusTone('idle');
		setIsSubmitting(true);
		try {
			const res = await authApi.verifyLoginOtp(
				email.trim().toLowerCase(),
				otp.trim(),
			);
			localStorage.setItem('token', res.data.access_token);
			navigate('/');
		} catch (err) {
			const status = err.response?.status;
			const detail = err.response?.data?.detail;

			if (status === 401) {
				setError(
					detail ||
						'Invalid or expired code. Please check and try again.',
				);
			} else if (status === 403) {
				setError(
					detail ||
						'This account has been deactivated. Contact support.',
				);
			} else if (err.code === 'ERR_NETWORK' || !err.response) {
				setError(
					'Unable to reach the server. Please check backend connection.',
				);
			} else {
				setError(detail || 'Verification failed. Please try again.');
			}
		} finally {
			setIsSubmitting(false);
		}
	}

	// ── Resend OTP ────────────────────────────────────────────────────────────
	async function handleResendOtp() {
		if (resendCountdown > 0) return;
		setStatusMessage('');
		setStatusTone('idle');
		setIsSubmitting(true);
		try {
			await authApi.sendLoginOtp(email.trim().toLowerCase());
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

	function goBack() {
		setStep('email');
		setOtp('');
		setStatusMessage('');
		setStatusTone('idle');
		if (countdownRef.current) clearInterval(countdownRef.current);
		setResendCountdown(0);
	}

	const panelTitle =
		step === 'email'
			? 'Return to your simulation command center.'
			: 'Check your inbox.';

	const formHeader =
		step === 'email'
			? {
					kicker: 'Welcome',
					heading: 'Sign in to continue',
					sub: `Enter your email and we'll send you a one-time sign-in code.`,
				}
			: {
					kicker: 'Verify your email',
					heading: 'Enter the code',
					sub: `We sent a 6-digit code to ${email}. Enter it below to sign in.`,
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
					{/* ── Left story panel ─────────────────────────────── */}
					<section className="auth-panel auth-story-panel">
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

						{/* ── Step 1: enter email ───────────────────────── */}
						{step === 'email' && (
							<form
								onSubmit={handleSendOtp}
								className="auth-form"
							>
								<div className="form-group auth-form-group">
									<label
										className="form-label"
										htmlFor="auth-email"
									>
										Email address
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
								<button
									type="submit"
									className="btn auth-submit"
									disabled={isSubmitting}
								>
									{isSubmitting
										? 'Sending code…'
										: 'Send sign-in code'}
								</button>
							</form>
						)}

						{/* ── Step 2: enter OTP ────────────────────────── */}
						{step === 'otp' && (
							<form
								onSubmit={handleVerifyOtp}
								className="auth-form"
							>
								<div className="form-group auth-form-group">
									<label
										className="form-label"
										htmlFor="auth-otp"
									>
										Sign-in code
									</label>
									<input
										id="auth-otp"
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
										autoFocus
										required
									/>
								</div>
								<button
									type="submit"
									className="btn auth-submit"
									disabled={isSubmitting || otp.length < 6}
								>
									{isSubmitting ? 'Verifying…' : 'Sign in'}
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
										onClick={goBack}
									>
										Change email
									</button>
								</div>
							</form>
						)}
					</section>
				</div>
			</section>
		</div>
	);
}
