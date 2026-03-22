import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function Auth() {
	const [isLogin, setIsLogin] = useState(true);
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');
	const [isUnauthorized, setIsUnauthorized] = useState(false);
	const navigate = useNavigate();

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError('');

		setIsUnauthorized(false);
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
				setIsLogin(true); // switch to login
				setError('Registered successfully, please log in.');
			}
		} catch (err) {
			const status = err.response?.status;
			const detail =
				err.response?.data?.detail ||
				'An error occurred. Please try again.';
			if (status === 403) {
				setIsUnauthorized(true);
			}
			setError(detail);
		}
	};

	return (
		<div
			className="fade-in"
			style={{
				display: 'flex',
				justifyContent: 'center',
				marginTop: '4rem',
			}}
		>
			<div
				className="card"
				style={{ maxWidth: 400, width: '100%' }}
			>
				<h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>
					{isLogin ? 'Welcome Back' : 'Create Account'}
				</h2>
				{error && (
					<div
						style={{
							color: error.includes('Registered')
								? 'var(--success-color)'
								: 'var(--danger-color)',
							marginBottom: '1rem',
							textAlign: 'center',
							...(isUnauthorized
								? {
										background: 'rgba(255,59,48,0.08)',
										border: '1px solid var(--danger-color)',
										borderRadius: 8,
										padding: '0.75rem',
									}
								: {}),
						}}
					>
						{isUnauthorized && (
							<div style={{ fontWeight: 700, marginBottom: 4 }}>
								Unauthorised
							</div>
						)}
						{error}
					</div>
				)}
				<form onSubmit={handleSubmit}>
					<div className="form-group">
						<label className="form-label">Email</label>
						<input
							type="email"
							className="input-field"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							required
						/>
					</div>
					<div className="form-group">
						<label className="form-label">Password</label>
						<input
							type="password"
							className="input-field"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							required
						/>
					</div>
					<button
						type="submit"
						className="btn"
						style={{ width: '100%', marginTop: '1rem' }}
					>
						{isLogin ? 'Sign In' : 'Sign Up'}
					</button>
				</form>

				<div
					style={{
						textAlign: 'center',
						marginTop: '1.5rem',
						fontSize: '0.9rem',
						color: 'var(--text-secondary)',
					}}
				>
					{isLogin
						? "Don't have an account? "
						: 'Already have an account? '}
					<button
						onClick={() => {
							setIsLogin(!isLogin);
							setError('');
						}}
						style={{
							color: 'var(--accent-color)',
							fontWeight: 600,
						}}
					>
						{isLogin ? 'Sign Up' : 'Log In'}
					</button>
				</div>
			</div>
		</div>
	);
}
