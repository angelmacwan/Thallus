import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import mermaid from 'mermaid';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { useSidebar } from '../SidebarContext';
import {
	RefreshCw,
	Send,
	Users,
	Link2,
	Info,
	FileText,
	X,
	Trash2,
	Rss,
	ThumbsUp,
	ThumbsDown,
	MessageSquare,
	ChevronDown,
	ChevronUp,
} from 'lucide-react';

mermaid.initialize({ startOnLoad: false, theme: 'neutral' });

// ─── Mermaid diagram block ────────────────────────────────────────────────────
function MermaidBlock({ code }) {
	const ref = useRef(null);
	const idRef = useRef(`mermaid-${Math.random().toString(36).slice(2)}`);
	useEffect(() => {
		if (!ref.current) return;
		mermaid
			.render(idRef.current, code)
			.then(({ svg }) => {
				if (ref.current) ref.current.innerHTML = svg;
			})
			.catch(() => {
				if (ref.current)
					ref.current.innerHTML = `<pre style="font-size:0.78rem;color:#666">${code}</pre>`;
			});
	}, [code]);
	return (
		<div
			ref={ref}
			style={{
				overflowX: 'auto',
				margin: '1rem 0',
				padding: '1rem',
				background: 'var(--surface-container-low)',
				borderRadius: '10px',
				border: '1px solid var(--outline-variant)',
			}}
		/>
	);
}

// ─── Session Reports Tab ──────────────────────────────────────────────────────
function SessionReportsList({ sessionId, onCountChange }) {
	const [reports, setReports] = useState([]);
	const [loading, setLoading] = useState(true);
	const [selected, setSelected] = useState(null);
	const [content, setContent] = useState(null);
	const [contentLoading, setContentLoading] = useState(false);
	const [deleting, setDeleting] = useState(null);

	const fetchReports = async () => {
		setLoading(true);
		try {
			const res = await api.get(`/reports/session/${sessionId}`);
			setReports(res.data);
			onCountChange(res.data.length);
		} catch {
			/* noop */
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchReports();
	}, [sessionId]);

	const openReport = async (report) => {
		setSelected(report);
		setContent(null);
		setContentLoading(true);
		try {
			const res = await api.get(`/reports/${report.report_id}/content`, {
				responseType: 'text',
				transformResponse: [(d) => d],
			});
			setContent(res.data);
		} catch {
			setContent(null);
		} finally {
			setContentLoading(false);
		}
	};

	const deleteReport = async (report, e) => {
		e.stopPropagation();
		setDeleting(report.report_id);
		try {
			await api.delete(`/reports/${report.report_id}`);
			const next = reports.filter(
				(r) => r.report_id !== report.report_id,
			);
			setReports(next);
			onCountChange(next.length);
			if (selected?.report_id === report.report_id) {
				setSelected(null);
				setContent(null);
			}
		} catch {
			/* noop */
		} finally {
			setDeleting(null);
		}
	};

	const mdComponents = {
		code({ node, inline, className, children, ...props }) {
			const lang = (className || '').replace('language-', '');
			if (!inline && lang === 'mermaid')
				return <MermaidBlock code={String(children).trim()} />;
			return inline ? (
				<code
					style={{
						background: 'var(--surface-container)',
						padding: '0.1em 0.35em',
						borderRadius: '4px',
						fontSize: '0.85em',
					}}
					{...props}
				>
					{children}
				</code>
			) : (
				<pre
					style={{
						background: 'var(--surface-container)',
						padding: '1rem',
						borderRadius: '8px',
						overflowX: 'auto',
						fontSize: '0.82rem',
						lineHeight: 1.6,
					}}
				>
					<code {...props}>{children}</code>
				</pre>
			);
		},
	};

	return (
		<div
			style={{
				display: 'flex',
				flex: 1,
				minHeight: 0,
				gap: '1rem',
				overflow: 'hidden',
			}}
		>
			{/* List */}
			<div
				style={{
					width: selected ? '280px' : '100%',
					flexShrink: 0,
					display: 'flex',
					flexDirection: 'column',
					gap: '0.5rem',
					overflowY: 'auto',
					transition: 'width 0.25s ease',
					paddingRight: '0.25rem',
				}}
			>
				{loading && (
					<div
						style={{
							textAlign: 'center',
							color: 'var(--text-secondary)',
							padding: '2rem',
							fontSize: '0.85rem',
						}}
					>
						Loading…
					</div>
				)}
				{!loading && reports.length === 0 && (
					<div
						style={{
							textAlign: 'center',
							color: 'var(--text-secondary)',
							padding: '2.5rem 1rem',
							fontSize: '0.85rem',
						}}
					>
						<FileText
							size={28}
							style={{ marginBottom: '0.5rem', opacity: 0.4 }}
						/>
						<div>No reports yet.</div>
						<div
							style={{ fontSize: '0.75rem', marginTop: '0.3rem' }}
						>
							Generate one using the button above.
						</div>
					</div>
				)}
				{reports.map((r) => (
					<div
						key={r.report_id}
						onClick={() => openReport(r)}
						style={{
							padding: '0.75rem 0.85rem',
							borderRadius: '8px',
							border: `1px solid ${selected?.report_id === r.report_id ? 'var(--accent-color)' : 'var(--outline-variant)'}`,
							background:
								selected?.report_id === r.report_id
									? 'rgba(var(--accent-rgb, 37,99,235),0.07)'
									: 'var(--surface-container-low)',
							cursor: 'pointer',
							display: 'flex',
							alignItems: 'flex-start',
							gap: '0.65rem',
							transition: 'border-color 0.15s, background 0.15s',
						}}
					>
						<FileText
							size={16}
							color="var(--accent-color)"
							style={{ marginTop: '0.1rem', flexShrink: 0 }}
						/>
						<div style={{ flex: 1, minWidth: 0 }}>
							<div
								style={{
									fontWeight: 600,
									fontSize: '0.83rem',
									whiteSpace: 'nowrap',
									overflow: 'hidden',
									textOverflow: 'ellipsis',
								}}
							>
								{r.title}
							</div>
							<div
								style={{
									fontSize: '0.71rem',
									color: 'var(--text-secondary)',
									marginTop: '0.15rem',
								}}
							>
								{new Date(r.created_at).toLocaleString()}
							</div>
						</div>
						<button
							onClick={(e) => deleteReport(r, e)}
							disabled={deleting === r.report_id}
							style={{
								background: 'none',
								border: 'none',
								cursor: 'pointer',
								color: 'var(--text-secondary)',
								padding: '0.15rem',
								borderRadius: '4px',
								flexShrink: 0,
								opacity: deleting === r.report_id ? 0.4 : 1,
							}}
						>
							<Trash2 size={13} />
						</button>
					</div>
				))}
			</div>

			{/* Viewer */}
			{selected && (
				<div
					style={{
						flex: 1,
						display: 'flex',
						flexDirection: 'column',
						minHeight: 0,
						background: 'var(--surface-container-low)',
						border: '1px solid var(--outline-variant)',
						borderRadius: '10px',
						overflow: 'hidden',
					}}
				>
					<div
						style={{
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'space-between',
							padding: '0.75rem 1rem',
							borderBottom: '1px solid var(--outline-variant)',
							flexShrink: 0,
						}}
					>
						<div
							style={{
								fontWeight: 700,
								fontSize: '0.9rem',
								overflow: 'hidden',
								textOverflow: 'ellipsis',
								whiteSpace: 'nowrap',
							}}
						>
							{selected.title}
						</div>
						<button
							onClick={() => {
								setSelected(null);
								setContent(null);
							}}
							style={{
								background: 'none',
								border: 'none',
								cursor: 'pointer',
								color: 'var(--text-secondary)',
								display: 'flex',
								padding: '0.2rem',
								borderRadius: '4px',
							}}
						>
							<X size={16} />
						</button>
					</div>
					<div
						style={{
							flex: 1,
							overflowY: 'auto',
							padding: '1.25rem 1.5rem',
						}}
					>
						{contentLoading && (
							<div
								style={{
									color: 'var(--text-secondary)',
									fontSize: '0.85rem',
								}}
							>
								Loading…
							</div>
						)}
						{!contentLoading && content && (
							<ReactMarkdown
								remarkPlugins={[remarkGfm]}
								components={mdComponents}
							>
								{content}
							</ReactMarkdown>
						)}
						{!contentLoading && !content && (
							<div
								style={{
									color: 'var(--text-secondary)',
									fontSize: '0.85rem',
								}}
							>
								Could not load report content.
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
}

const EVENT_ICONS = {
	stage: '⚙️',
	agent: '🤖',
	action: '📝',
	round: '🔄',
	error: '❌',
	done: '✅',
};

// ─── Tab bar ──────────────────────────────────────────────────────────────────
function Tabs({ tabs, active, onChange }) {
	return (
		<div
			style={{
				display: 'flex',
				gap: '0.2rem',
				background: '#f5ede4',
				borderRadius: '10px',
				padding: '0.25rem',
			}}
		>
			{tabs.map((t) => (
				<button
					key={t.id}
					onClick={() => onChange(t.id)}
					style={{
						flex: 1,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						gap: '0.3rem',
						padding: '0.45rem 0.5rem',
						borderRadius: '7px',
						fontSize: '0.8rem',
						fontWeight: 600,
						cursor: 'pointer',
						border: 'none',
						background: active === t.id ? '#fff' : 'transparent',
						color:
							active === t.id
								? 'var(--accent-color)'
								: 'var(--text-secondary)',
						boxShadow:
							active === t.id
								? '0 1px 4px rgba(0,0,0,0.08)'
								: 'none',
						transition: 'all 0.15s',
					}}
				>
					{t.icon}
					{t.label}
				</button>
			))}
		</div>
	);
}

// ─── Social Feed

// ─── Social Feed ─────────────────────────────────────────────────────────────
const FEED_AVATAR_COLORS = [
	'#2563eb',
	'#7c3aed',
	'#db2777',
	'#d97706',
	'#059669',
	'#0891b2',
	'#4f46e5',
	'#dc2626',
	'#9d174d',
	'#065f46',
];
const feedAvatarColor = (idx) =>
	FEED_AVATAR_COLORS[
		(((idx ?? 0) % FEED_AVATAR_COLORS.length) + FEED_AVATAR_COLORS.length) %
			FEED_AVATAR_COLORS.length
	];

function getVal(obj, ...keys) {
	for (const k of keys) {
		if (obj[k] !== undefined && obj[k] !== null) return obj[k];
	}
	return null;
}

function formatFeedDate(val) {
	if (!val) return null;
	try {
		if (typeof val === 'number') {
			// Heuristic: if < 1e10 it's seconds, otherwise milliseconds
			return new Date(val < 1e10 ? val * 1000 : val).toLocaleString();
		}
		return new Date(val).toLocaleString();
	} catch {
		return String(val);
	}
}

function CommentRow({ comment, agentMap }) {
	const content = getVal(comment, 'content', 'body', 'text', 'message') || '';
	const userId = getVal(comment, 'user_id', 'agent_id', 'author_id');
	const agent =
		comment._agent || agentMap?.[userId] || agentMap?.[String(userId)];
	const likes = Number(
		getVal(comment, 'num_likes', 'like_count', 'upvotes', 'likes') ?? 0,
	);
	const displayName =
		agent?.realname || (userId != null ? `Agent ${userId}` : 'Unknown');
	const username =
		agent?.username || (userId != null ? `user${userId}` : 'unknown');
	const initial = displayName.charAt(0).toUpperCase();
	const agentIdx = agentMap
		? Object.keys(agentMap).findIndex((k) => agentMap[k] === agent)
		: -1;
	const color = feedAvatarColor(agentIdx >= 0 ? agentIdx : (userId ?? 0));

	return (
		<div
			style={{
				display: 'flex',
				gap: '0.55rem',
				padding: '0.65rem 0.9rem 0.65rem 1.25rem',
				borderBottom: '1px solid var(--outline-variant)',
				background: 'var(--surface-container-lowest)',
			}}
		>
			<div
				style={{
					width: 28,
					height: 28,
					borderRadius: '50%',
					background: color,
					color: '#fff',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					fontWeight: 700,
					fontSize: '0.7rem',
					flexShrink: 0,
				}}
			>
				{initial}
			</div>
			<div style={{ flex: 1, minWidth: 0 }}>
				<div
					style={{
						display: 'flex',
						gap: '0.35rem',
						alignItems: 'baseline',
						flexWrap: 'wrap',
					}}
				>
					<span style={{ fontWeight: 600, fontSize: '0.78rem' }}>
						{displayName}
					</span>
					<span
						style={{
							fontSize: '0.68rem',
							color: 'var(--text-secondary)',
						}}
					>
						@{username}
					</span>
				</div>
				{content && (
					<div
						style={{
							fontSize: '0.8rem',
							marginTop: '0.2rem',
							lineHeight: 1.55,
							color: 'var(--text-primary)',
						}}
					>
						{content}
					</div>
				)}
				{likes > 0 && (
					<div
						style={{
							fontSize: '0.68rem',
							color: 'var(--text-secondary)',
							marginTop: '0.25rem',
							display: 'flex',
							alignItems: 'center',
							gap: '0.2rem',
						}}
					>
						<ThumbsUp size={10} />
						{likes}
					</div>
				)}
			</div>
		</div>
	);
}

function PostCard({ post, comments, agentMap }) {
	const [showComments, setShowComments] = useState(false);

	const content = getVal(post, 'content', 'body', 'text', 'message') || '';
	const userId = getVal(post, 'user_id', 'agent_id', 'author_id');
	const agent =
		post._agent || agentMap?.[userId] || agentMap?.[String(userId)];
	const likes = Number(
		getVal(post, 'num_likes', 'like_count', 'upvotes', 'likes') ?? 0,
	);
	const dislikes = Number(
		getVal(
			post,
			'num_dislikes',
			'dislike_count',
			'downvotes',
			'dislikes',
		) ?? 0,
	);
	const createdAt = getVal(
		post,
		'created_at',
		'timestamp',
		'date',
		'posted_at',
	);

	const displayName =
		agent?.realname || (userId != null ? `Agent ${userId}` : 'Unknown');
	const username =
		agent?.username || (userId != null ? `user${userId}` : 'unknown');
	const profession = agent?.profession || null;
	const initial = displayName.charAt(0).toUpperCase();
	const agentIdx = agentMap
		? Object.keys(agentMap).findIndex((k) => agentMap[k] === agent)
		: -1;
	const color = feedAvatarColor(agentIdx >= 0 ? agentIdx : (userId ?? 0));

	return (
		<div
			style={{
				background: 'var(--surface-container-low)',
				border: '1px solid var(--outline-variant)',
				borderRadius: '12px',
				overflow: 'hidden',
				flexShrink: 0,
			}}
		>
			{/* Header */}
			<div
				style={{
					display: 'flex',
					gap: '0.65rem',
					padding: '0.85rem',
					alignItems: 'flex-start',
				}}
			>
				<div
					style={{
						width: 38,
						height: 38,
						borderRadius: '50%',
						background: color,
						color: '#fff',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						fontWeight: 700,
						fontSize: '0.88rem',
						flexShrink: 0,
					}}
				>
					{initial}
				</div>
				<div style={{ flex: 1, minWidth: 0 }}>
					<div
						style={{
							display: 'flex',
							alignItems: 'baseline',
							gap: '0.35rem',
							flexWrap: 'wrap',
						}}
					>
						<span style={{ fontWeight: 700, fontSize: '0.85rem' }}>
							{displayName}
						</span>
						<span
							style={{
								fontSize: '0.74rem',
								color: 'var(--text-secondary)',
							}}
						>
							@{username}
						</span>
						{profession && (
							<span
								style={{
									fontSize: '0.68rem',
									color: 'var(--text-secondary)',
									opacity: 0.75,
								}}
							>
								· {profession}
							</span>
						)}
					</div>
					{createdAt && (
						<div
							style={{
								fontSize: '0.67rem',
								color: 'var(--text-secondary)',
								marginTop: '0.1rem',
							}}
						>
							{formatFeedDate(createdAt)}
						</div>
					)}
				</div>
			</div>

			{/* Content */}
			{content && (
				<div
					style={{
						padding: '0 0.9rem 0.85rem',
						fontSize: '0.85rem',
						lineHeight: 1.65,
						color: 'var(--text-primary)',
					}}
				>
					{content}
				</div>
			)}

			{/* Stats bar */}
			<div
				style={{
					display: 'flex',
					gap: '1.1rem',
					padding: '0.55rem 0.9rem',
					borderTop: '1px solid var(--outline-variant)',
					background: 'var(--surface-container)',
					alignItems: 'center',
					fontSize: '0.75rem',
					color: 'var(--text-secondary)',
				}}
			>
				<span
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: '0.3rem',
					}}
				>
					<ThumbsUp size={13} />
					{likes}
				</span>
				<span
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: '0.3rem',
					}}
				>
					<ThumbsDown size={13} />
					{dislikes}
				</span>
				{comments.length > 0 ? (
					<button
						onClick={() => setShowComments((v) => !v)}
						style={{
							background: 'none',
							border: 'none',
							cursor: 'pointer',
							fontSize: '0.75rem',
							color: 'var(--text-secondary)',
							display: 'flex',
							alignItems: 'center',
							gap: '0.3rem',
							padding: 0,
							marginLeft: 'auto',
						}}
					>
						<MessageSquare size={13} />
						{comments.length}{' '}
						{comments.length === 1 ? 'comment' : 'comments'}
						{showComments ? (
							<ChevronUp size={12} />
						) : (
							<ChevronDown size={12} />
						)}
					</button>
				) : (
					<span
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: '0.3rem',
							marginLeft: 'auto',
							opacity: 0.6,
						}}
					>
						<MessageSquare size={13} />0
					</span>
				)}
			</div>

			{/* Comments */}
			{showComments && comments.length > 0 && (
				<div style={{ borderTop: '1px solid var(--outline-variant)' }}>
					{comments.map((c, ci) => (
						<CommentRow
							key={getVal(c, 'comment_id', 'id') ?? ci}
							comment={c}
							agentMap={agentMap}
						/>
					))}
				</div>
			)}
		</div>
	);
}

function SocialFeed({ sessionId }) {
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		api.get(`/simulation/feed/${sessionId}`)
			.then((r) => setData(r.data))
			.catch(() => setData({ posts: [], comments: [], agents: [] }))
			.finally(() => setLoading(false));
	}, [sessionId]);

	if (loading)
		return (
			<div
				style={{
					textAlign: 'center',
					color: 'var(--text-secondary)',
					padding: '3rem',
					fontSize: '0.85rem',
				}}
			>
				<RefreshCw
					size={20}
					style={{
						animation: 'spin 1.4s linear infinite',
						marginBottom: '0.5rem',
						color: 'var(--accent-color)',
					}}
				/>
				<div>Loading feed…</div>
			</div>
		);

	const { posts = [], comments = [], agents = [] } = data || {};

	// Build 0-indexed agent map
	const agentMap = {};
	agents.forEach((a, i) => {
		agentMap[i] = a;
		agentMap[String(i)] = a;
	});

	// Group comments by post_id
	const commentsByPost = {};
	comments.forEach((c) => {
		const pid = getVal(c, 'post_id');
		if (pid === undefined || pid === null) return;
		if (!commentsByPost[pid]) commentsByPost[pid] = [];
		commentsByPost[pid].push(c);
	});

	if (posts.length === 0)
		return (
			<div
				style={{
					textAlign: 'center',
					color: 'var(--text-secondary)',
					padding: '3rem 1rem',
					fontSize: '0.85rem',
				}}
			>
				<Rss
					size={28}
					style={{ marginBottom: '0.5rem', opacity: 0.4 }}
				/>
				<div style={{ fontWeight: 600 }}>No feed data yet.</div>
				<div style={{ fontSize: '0.75rem', marginTop: '0.3rem' }}>
					Posts and interactions will appear here once the simulation
					completes.
				</div>
			</div>
		);

	return (
		<div
			style={{
				flex: 1,
				overflowY: 'auto',
				display: 'flex',
				flexDirection: 'column',
				gap: '0.75rem',
				paddingRight: '0.25rem',
			}}
		>
			<div
				style={{
					fontSize: '0.72rem',
					color: 'var(--text-secondary)',
					fontWeight: 600,
					paddingBottom: '0.25rem',
				}}
			>
				{posts.length} post{posts.length !== 1 ? 's' : ''} ·{' '}
				{comments.length} comment{comments.length !== 1 ? 's' : ''}
			</div>
			{posts.map((post, i) => {
				const postId = getVal(post, 'post_id', 'id') ?? i;
				return (
					<PostCard
						key={postId}
						post={post}
						comments={commentsByPost[postId] || []}
						agentMap={agentMap}
					/>
				);
			})}
		</div>
	);
}

// ─── Create Report Modal ──────────────────────────────────────────────────────
function CreateReportModal({ sessionId, onClose, onCreated }) {
	const [description, setDescription] = useState('');
	const [generating, setGenerating] = useState(false);
	const [error, setError] = useState(null);

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (!description.trim()) return;
		setGenerating(true);
		setError(null);
		try {
			const res = await api.post(`/reports/generate/${sessionId}`, {
				description: description.trim(),
			});
			onCreated(res.data);
			onClose();
		} catch (err) {
			setError(
				err?.response?.data?.detail || 'Failed to generate report.',
			);
		} finally {
			setGenerating(false);
		}
	};

	return (
		<div
			style={{
				position: 'fixed',
				inset: 0,
				background: 'rgba(0,0,0,0.45)',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				zIndex: 1000,
				padding: '1rem',
			}}
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div
				style={{
					background: 'var(--surface)',
					borderRadius: '14px',
					padding: '2rem',
					width: '100%',
					maxWidth: '560px',
					display: 'flex',
					flexDirection: 'column',
					gap: '1.25rem',
					boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
					border: '1px solid var(--outline-variant)',
				}}
			>
				{/* Header */}
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'space-between',
					}}
				>
					<div
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: '0.6rem',
						}}
					>
						<FileText
							size={20}
							color="var(--accent-color)"
						/>
						<h3 style={{ margin: 0, fontSize: '1rem' }}>
							Generate Report
						</h3>
					</div>
					<button
						onClick={onClose}
						style={{
							background: 'none',
							border: 'none',
							cursor: 'pointer',
							color: 'var(--text-secondary)',
							display: 'flex',
							alignItems: 'center',
							padding: '0.25rem',
							borderRadius: '6px',
						}}
					>
						<X size={18} />
					</button>
				</div>

				{/* Body */}
				<p
					style={{
						margin: 0,
						fontSize: '0.85rem',
						color: 'var(--text-secondary)',
						lineHeight: 1.6,
					}}
				>
					Describe the focus or question for this report. The agent
					will use the simulation data, knowledge graph, and chat
					history to produce an enterprise-grade Markdown report with
					diagrams.
				</p>

				<form
					onSubmit={handleSubmit}
					style={{
						display: 'flex',
						flexDirection: 'column',
						gap: '1rem',
					}}
				>
					<textarea
						className="input-field"
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						placeholder="e.g. Analyse information spread patterns and identify key influencers in this simulation…"
						rows={5}
						disabled={generating}
						style={{
							resize: 'vertical',
							fontFamily: 'inherit',
							fontSize: '0.88rem',
							lineHeight: 1.6,
						}}
					/>

					{error && (
						<div
							style={{
								padding: '0.65rem 0.85rem',
								background: 'rgba(220,38,38,0.08)',
								border: '1px solid rgba(220,38,38,0.2)',
								borderRadius: '8px',
								color: 'var(--danger-color)',
								fontSize: '0.82rem',
							}}
						>
							{error}
						</div>
					)}

					<div
						style={{
							display: 'flex',
							gap: '0.75rem',
							justifyContent: 'flex-end',
						}}
					>
						<button
							type="button"
							className="btn btn-secondary"
							onClick={onClose}
							disabled={generating}
						>
							Cancel
						</button>
						<button
							type="submit"
							className="btn"
							disabled={generating || !description.trim()}
							style={{
								display: 'flex',
								alignItems: 'center',
								gap: '0.45rem',
							}}
						>
							{generating ? (
								<>
									<RefreshCw
										size={14}
										style={{
											animation:
												'spin 1.4s linear infinite',
										}}
									/>
									Generating…
								</>
							) : (
								<>
									<FileText size={14} />
									Generate Report
								</>
							)}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}

// ─── Main view ────────────────────────────────────────────────────────────────
export default function SessionView() {
	const { id } = useParams();
	const navigate = useNavigate();
	const [session, setSession] = useState(null);
	const [messages, setMessages] = useState([]);
	const [query, setQuery] = useState('');
	const [loading, setLoading] = useState(true);
	const [chatLoading, setChatLoading] = useState(false);
	const [liveLog, setLiveLog] = useState([]);
	const [artifacts, setArtifacts] = useState({
		agents: [],
		graph: { entities: {}, relations: [] },
	});
	const [activeTab, setActiveTab] = useState('feed');
	const [dbEvents, setDbEvents] = useState([]);
	const [showReportModal, setShowReportModal] = useState(false);
	const [reportsCount, setReportsCount] = useState(0);
	const messagesEndRef = useRef(null);
	const logEndRef = useRef(null);
	const { setSessionNav } = useSidebar();

	useEffect(() => {
		const agentCount = (artifacts.agents || []).length;
		const relationCount = ((artifacts.graph || {}).relations || []).length;
		setSessionNav({
			activeTab,
			setActiveTab,
			agentCount,
			relationCount,
			reportsCount,
			session,
			onCreateReport:
				session?.status === 'completed'
					? () => setShowReportModal(true)
					: null,
		});
		return () => setSessionNav(null);
	}, [activeTab, artifacts, session, reportsCount]);

	useEffect(() => {
		fetchData();
		const interval = setInterval(() => {
			if (session?.status === 'running') fetchData(false);
		}, 5000);
		return () => clearInterval(interval);
	}, [id, session?.status]);

	useEffect(() => {
		if (session?.status !== 'running') return;
		const token = localStorage.getItem('token');
		const base =
			import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
		const url = `${base}/simulation/stream/${id}?token=${encodeURIComponent(token)}`;
		const es = new EventSource(url);
		es.onmessage = (e) => {
			try {
				const ev = JSON.parse(e.data);
				setLiveLog((prev) => [...prev, ev]);
				if (ev.type === 'done' || ev.type === 'error') es.close();
			} catch {
				/* noop */
			}
		};
		es.onerror = () => es.close();
		return () => es.close();
	}, [id, session?.status]);

	useEffect(() => {
		logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [liveLog]);
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [messages]);

	const fetchData = async (showLoader = true) => {
		if (showLoader) setLoading(true);
		try {
			const res = await api.get(`/sessions/${id}`);
			setSession(res.data);
			if (res.data.status === 'completed') {
				const [chatRes, artRes] = await Promise.all([
					api.get(`/simulation/chat/${id}`),
					api.get(`/simulation/artifacts/${id}`),
				]);
				setMessages(chatRes.data || []);
				setArtifacts(
					artRes.data || {
						agents: [],
						graph: { entities: {}, relations: [] },
					},
				);
				// Fetch persisted simulation events
				try {
					const evRes = await api.get(`/simulation/events/${id}`);
					setDbEvents(evRes.data || []);
				} catch {
					/* non-fatal */
				}
			}
		} catch (err) {
			console.error(err);
		} finally {
			if (showLoader) setLoading(false);
		}
	};

	const handleChat = async (e) => {
		e.preventDefault();
		if (!query.trim()) return;
		const userQ = query;
		setQuery('');
		setMessages((prev) => [
			...prev,
			{ text: userQ, is_user: true, id: Date.now() },
		]);
		setChatLoading(true);
		try {
			const formData = new URLSearchParams();
			formData.append('query', userQ);
			const res = await api.post(`/simulation/chat/${id}`, formData, {
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
			});
			setMessages((prev) => [...prev, res.data]);
		} catch (err) {
			console.error(err);
			alert('Error sending message');
		} finally {
			setChatLoading(false);
		}
	};

	if (loading)
		return (
			<div
				style={{
					textAlign: 'center',
					marginTop: '5rem',
					color: 'var(--text-secondary)',
				}}
			>
				<style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
				<RefreshCw
					size={28}
					style={{
						animation: 'spin 1.4s linear infinite',
						marginBottom: '1rem',
						color: 'var(--accent-color)',
					}}
				/>
				<p>Loading session…</p>
			</div>
		);
	if (!session)
		return (
			<div style={{ textAlign: 'center', marginTop: '4rem' }}>
				Session not found.
			</div>
		);

	const agents = artifacts.agents || [];
	const graph = artifacts.graph || { entities: {}, relations: [] };
	const relations = graph.relations || [];

	return (
		<div
			className="fade-in"
			style={{
				display: 'flex',
				flexDirection: 'column',
				gap: '1.25rem',
				height: '100%',
				overflow: 'hidden',
			}}
		>
			<style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>

			{showReportModal && session && (
				<CreateReportModal
					sessionId={id}
					onClose={() => setShowReportModal(false)}
					onCreated={() => {}}
				/>
			)}

			{/* ── Split body ── */}
			<div
				style={{
					display: 'flex',
					gap: '1.5rem',
					alignItems: 'stretch',
					flex: 1,
					minHeight: 0,
					overflow: 'hidden',
				}}
			>
				{/* LEFT PANEL */}
				<div
					style={{
						width: '42%',
						flexShrink: 0,
						display: 'flex',
						flexDirection: 'column',
						gap: '1rem',
						minHeight: 0,
						overflowY: 'auto',
					}}
				>
					{/* Running: live log */}
					{session.status === 'running' && (
						<div
							className="card"
							style={{
								padding: '1.25rem',
								flex: 1,
								display: 'flex',
								flexDirection: 'column',
							}}
						>
							<div
								style={{
									display: 'flex',
									alignItems: 'center',
									gap: '0.6rem',
									marginBottom: '0.85rem',
								}}
							>
								<RefreshCw
									size={15}
									color="var(--accent-color)"
									style={{
										animation: 'spin 2s linear infinite',
									}}
								/>
								<span
									style={{
										fontWeight: 600,
										fontSize: '0.88rem',
									}}
								>
									Simulation running…
								</span>
							</div>
							<div
								style={{
									background: 'var(--primary)',
									border: '1px solid var(--primary-container)',
									borderRadius: '8px',
									padding: '0.85rem',
									fontFamily: 'monospace',
									fontSize: '0.78rem',
									lineHeight: 1.65,
									flex: 1,
									overflowY: 'auto',
									color: 'var(--primary-fixed)',
								}}
							>
								{liveLog.length === 0 && (
									<span style={{ color: '#8c7c6c' }}>
										Waiting for events…
									</span>
								)}
								{liveLog.map((ev, i) => (
									<div
										key={i}
										style={{
											color:
												ev.type === 'error'
													? '#f87171'
													: ev.type === 'done'
														? '#4ade80'
														: ev.type === 'round'
															? '#fb923c'
															: ev.type ===
																  'agent'
																? '#c084fc'
																: '#d4c8bc',
											padding: '0.07rem 0',
										}}
									>
										<span
											style={{
												color: '#7c6c5c',
												marginRight: '0.35rem',
												userSelect: 'none',
											}}
										>
											›
										</span>
										<span style={{ marginRight: '0.3rem' }}>
											{EVENT_ICONS[ev.type] ?? '•'}
										</span>
										{ev.message}
									</div>
								))}
								<div ref={logEndRef} />
							</div>
						</div>
					)}

					{/* Error */}
					{session.status === 'error' && (
						<div
							style={{
								display: 'flex',
								flexDirection: 'column',
								alignItems: 'flex-start',
								gap: '1rem',
								padding: '1.25rem',
								background: 'rgba(220,38,38,0.07)',
								border: '1px solid rgba(220,38,38,0.2)',
								borderRadius: '8px',
								color: 'var(--danger-color)',
							}}
						>
							<span>
								Simulation failed. Check the backend logs for
								details.
							</span>
						</div>
					)}

					{session.status === 'completed' && (
						<div
							className="card"
							style={{
								padding: '1.25rem',
								display: 'flex',
								flexDirection: 'column',
								gap: '1rem',
								flex: 1,
								minHeight: 0,
								overflow: 'hidden',
							}}
						>
							{/* Feed */}
							{activeTab === 'feed' && (
								<SocialFeed sessionId={id} />
							)}

							{/* Agents */}
							{activeTab === 'agents' && (
								<div
									style={{
										display: 'flex',
										flexDirection: 'column',
										gap: '0.55rem',
										flex: 1,
										overflowY: 'auto',
										paddingRight: '0.2rem',
									}}
								>
									{agents.length === 0 && (
										<div
											style={{
												color: 'var(--text-secondary)',
												textAlign: 'center',
												padding: '2rem',
											}}
										>
											No agents found.
										</div>
									)}
									{agents.map((a, i) => (
										<div
											key={i}
											style={{
												display: 'flex',
												alignItems: 'center',
												gap: '0.75rem',
												padding: '0.6rem 0.75rem',
												background:
													'var(--surface-container-low)',
												borderRadius: '8px',
												border: '1px solid var(--outline-variant)',
											}}
										>
											<div
												style={{
													width: 36,
													height: 36,
													borderRadius: '50%',
													background:
														'var(--accent-color)',
													display: 'flex',
													alignItems: 'center',
													justifyContent: 'center',
													flexShrink: 0,
													color: '#fff',
													fontWeight: 700,
													fontSize: '0.88rem',
												}}
											>
												{(a.realname || '?')
													.charAt(0)
													.toUpperCase()}
											</div>
											<div style={{ minWidth: 0 }}>
												<div
													style={{
														fontWeight: 600,
														fontSize: '0.84rem',
														whiteSpace: 'nowrap',
														overflow: 'hidden',
														textOverflow:
															'ellipsis',
													}}
												>
													{a.realname}
												</div>
												<div
													style={{
														fontSize: '0.73rem',
														color: 'var(--text-secondary)',
													}}
												>
													@{a.username} ·{' '}
													{a.profession || 'Unknown'}
												</div>
											</div>
											<div
												style={{
													marginLeft: 'auto',
													fontSize: '0.7rem',
													color: 'var(--text-secondary)',
													flexShrink: 0,
												}}
											>
												{a.country}
											</div>
										</div>
									))}
								</div>
							)}

							{/* Relations */}
							{activeTab === 'relations' && (
								<div
									style={{
										display: 'flex',
										flexDirection: 'column',
										gap: '0.45rem',
										flex: 1,
										overflowY: 'auto',
										paddingRight: '0.2rem',
									}}
								>
									{relations.length === 0 && (
										<div
											style={{
												color: 'var(--text-secondary)',
												textAlign: 'center',
												padding: '2rem',
											}}
										>
											No relations found.
										</div>
									)}
									{relations.map((r, i) => (
										<div
											key={i}
											style={{
												display: 'flex',
												alignItems: 'center',
												gap: '0.5rem',
												fontSize: '0.78rem',
												padding: '0.4rem 0.65rem',
												background:
													'var(--surface-container-low)',
												borderRadius: '6px',
												border: '1px solid var(--outline-variant)',
											}}
										>
											<span
												style={{
													fontWeight: 600,
													flexShrink: 0,
													maxWidth: '32%',
													overflow: 'hidden',
													textOverflow: 'ellipsis',
													whiteSpace: 'nowrap',
												}}
											>
												{r.source}
											</span>
											<span
												style={{
													flex: 1,
													textAlign: 'center',
													color: 'var(--accent-color)',
													fontWeight: 700,
													fontSize: '0.63rem',
													textTransform: 'uppercase',
													letterSpacing: '0.04em',
													whiteSpace: 'nowrap',
												}}
											>
												{r.type}
											</span>
											<span
												style={{
													fontWeight: 600,
													flexShrink: 0,
													maxWidth: '32%',
													overflow: 'hidden',
													textOverflow: 'ellipsis',
													whiteSpace: 'nowrap',
													textAlign: 'right',
												}}
											>
												{r.target}
											</span>
										</div>
									))}
								</div>
							)}

							{/* Info */}
							{activeTab === 'info' && (
								<div
									style={{
										display: 'flex',
										flexDirection: 'column',
										gap: '0.85rem',
										flex: 1,
										overflowY: 'auto',
									}}
								>
									{/* Session metadata */}
									<div
										style={{
											background:
												'var(--surface-container-low)',
											border: '1px solid var(--outline-variant)',
											borderRadius: '8px',
											padding: '0.85rem',
											display: 'flex',
											flexDirection: 'column',
											gap: '0.55rem',
										}}
									>
										<div
											style={{
												display: 'flex',
												justifyContent: 'space-between',
												alignItems: 'center',
											}}
										>
											<span
												style={{
													fontSize: '0.73rem',
													color: 'var(--text-secondary)',
													fontWeight: 600,
												}}
											>
												Session ID
											</span>
											<span
												style={{
													fontSize: '0.73rem',
													fontFamily: 'monospace',
													wordBreak: 'break-all',
													textAlign: 'right',
													maxWidth: '65%',
												}}
											>
												{session.session_id}
											</span>
										</div>
										<div
											style={{
												display: 'flex',
												justifyContent: 'space-between',
												alignItems: 'center',
											}}
										>
											<span
												style={{
													fontSize: '0.73rem',
													color: 'var(--text-secondary)',
													fontWeight: 600,
												}}
											>
												Status
											</span>
											<span
												style={{
													padding: '0.2rem 0.6rem',
													borderRadius: '10px',
													background:
														session.status ===
														'completed'
															? 'var(--success-color)'
															: session.status ===
																  'running'
																? 'var(--accent-color)'
																: 'var(--danger-color)',
													color: '#fff',
													fontSize: '0.68rem',
													fontWeight: 700,
													letterSpacing: '0.05em',
												}}
											>
												{session.status.toUpperCase()}
											</span>
										</div>
										<div
											style={{
												display: 'flex',
												justifyContent: 'space-between',
												alignItems: 'center',
											}}
										>
											<span
												style={{
													fontSize: '0.73rem',
													color: 'var(--text-secondary)',
													fontWeight: 600,
												}}
											>
												Created
											</span>
											<span
												style={{ fontSize: '0.73rem' }}
											>
												{new Date(
													session.created_at,
												).toLocaleString()}
											</span>
										</div>
									</div>

									{/* Logs */}
									<div
										style={{
											fontSize: '0.73rem',
											fontWeight: 600,
											color: 'var(--text-secondary)',
										}}
									>
										Event Log
									</div>
									<div
										style={{
											background: 'var(--primary)',
											border: '1px solid var(--primary-container)',
											borderRadius: '8px',
											padding: '0.85rem',
											fontFamily: 'monospace',
											fontSize: '0.78rem',
											lineHeight: 1.65,
											flex: 1,
											overflowY: 'auto',
											color: 'var(--primary-fixed)',
											minHeight: '8rem',
										}}
									>
										{(() => {
											const displayLog =
												dbEvents.length > 0
													? dbEvents
													: liveLog;
											return displayLog.length === 0 ? (
												<span
													style={{ color: '#8c7c6c' }}
												>
													No log entries.
												</span>
											) : (
												displayLog.map((ev, i) => (
													<div
														key={i}
														style={{
															color:
																ev.type ===
																'error'
																	? '#f87171'
																	: ev.type ===
																		  'done'
																		? '#4ade80'
																		: ev.type ===
																			  'round'
																			? '#fb923c'
																			: ev.type ===
																				  'agent'
																				? '#c084fc'
																				: '#d4c8bc',
															padding:
																'0.07rem 0',
														}}
													>
														<span
															style={{
																color: '#7c6c5c',
																marginRight:
																	'0.35rem',
																userSelect:
																	'none',
															}}
														>
															›
														</span>
														<span
															style={{
																marginRight:
																	'0.3rem',
															}}
														>
															{EVENT_ICONS[
																ev.type
															] ?? '•'}
														</span>
														{ev.message}
													</div>
												))
											);
										})()}
									</div>
								</div>
							)}

							{/* Reports */}
							{activeTab === 'reports' && (
								<SessionReportsList
									sessionId={id}
									onCountChange={setReportsCount}
								/>
							)}
						</div>
					)}
				</div>

				{/* RIGHT PANEL: Chat */}
				<div
					style={{
						flex: 1,
						display: 'flex',
						flexDirection: 'column',
						gap: '0.6rem',
						minHeight: 0,
					}}
				>
					{session.status !== 'completed' ? (
						<div
							className="card"
							style={{
								textAlign: 'center',
								padding: '3rem 2rem',
								color: 'var(--text-secondary)',
							}}
						>
							{session.status === 'running' ? (
								<>
									<RefreshCw
										size={24}
										color="var(--accent-color)"
										style={{
											animation:
												'spin 2s linear infinite',
											marginBottom: '0.75rem',
										}}
									/>
									<p>
										Chat will be available once the
										simulation completes.
									</p>
								</>
							) : (
								<p>Simulation did not complete successfully.</p>
							)}
						</div>
					) : (
						<div
							style={{
								display: 'flex',
								flexDirection: 'column',
								flex: 1,
								minHeight: '480px',
								background: 'var(--surface-container-lowest)',
								border: '1px solid var(--outline-variant)',
								borderRadius: '12px',
								overflow: 'hidden',
							}}
						>
							<div
								style={{
									flex: 1,
									overflowY: 'auto',
									padding: '1.25rem',
									display: 'flex',
									flexDirection: 'column',
									gap: '1rem',
								}}
							>
								{messages.length === 0 && (
									<div
										style={{
											textAlign: 'center',
											color: 'var(--text-secondary)',
											marginTop: '4rem',
										}}
									>
										<div
											style={{
												fontSize: '2.5rem',
												marginBottom: '0.75rem',
											}}
										>
											💬
										</div>
										<p style={{ fontSize: '0.9rem' }}>
											Ask the Report Agent anything about
											this simulation.
										</p>
									</div>
								)}
								{messages.map((msg, idx) => (
									<div
										key={msg.id || idx}
										className={`chat-bubble ${msg.is_user ? 'user' : 'agent'}`}
									>
										<ReactMarkdown
											remarkPlugins={[remarkGfm]}
										>
											{msg.text}
										</ReactMarkdown>
									</div>
								))}
								{chatLoading && (
									<div
										className="chat-bubble agent"
										style={{
											display: 'flex',
											gap: '0.5rem',
											alignItems: 'center',
										}}
									>
										<RefreshCw
											size={14}
											style={{
												animation:
													'spin 1.4s linear infinite',
											}}
										/>{' '}
										Thinking…
									</div>
								)}
								<div ref={messagesEndRef} />
							</div>
							<form
								onSubmit={handleChat}
								style={{
									display: 'flex',
									gap: '0.5rem',
									padding: '0.85rem',
									borderTop:
										'1px solid var(--outline-variant)',
									background: 'var(--surface-container-low)',
								}}
							>
								<input
									className="input-field"
									value={query}
									onChange={(e) => setQuery(e.target.value)}
									placeholder="Ask a question about the simulation…"
									disabled={chatLoading}
									style={{ flex: 1 }}
								/>
								<button
									type="submit"
									className="btn"
									disabled={chatLoading}
									style={{ padding: '0.7rem', flexShrink: 0 }}
								>
									<Send size={18} />
								</button>
							</form>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
