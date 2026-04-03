import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import mermaid from 'mermaid';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import InsightsDashboard from '../components/InsightsDashboard';
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
	FlaskConical,
	Play,
	Plus,
	Tag,
	Globe,
	FolderOpen,
	File,
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

// ─── Seed Data Tab ───────────────────────────────────────────────────────────
function SeedDataPanel({ sessionId }) {
	const [docs, setDocs] = useState([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		setLoading(true);
		api.get(`/simulation/seed-docs/${sessionId}`)
			.then((res) => setDocs(res.data.documents || []))
			.catch(() => {})
			.finally(() => setLoading(false));
	}, [sessionId]);

	const formatBytes = (bytes) => {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	};

	const userDocs = docs.filter((d) => !d.is_web_result);
	const webDocs = docs.filter((d) => d.is_web_result);

	if (loading)
		return (
			<div
				style={{
					textAlign: 'center',
					padding: '2rem',
					color: 'var(--text-secondary)',
					fontSize: '0.85rem',
				}}
			>
				Loading…
			</div>
		);

	const DocRow = ({ doc }) => (
		<div
			style={{
				display: 'flex',
				alignItems: 'center',
				gap: '0.6rem',
				padding: '0.6rem 0.75rem',
				borderRadius: '8px',
				border: '1px solid var(--outline-variant)',
				background: 'var(--surface-container-low)',
			}}
		>
			<div style={{ flexShrink: 0 }}>
				{doc.is_web_result ? (
					<Globe
						size={15}
						color="var(--accent-color)"
					/>
				) : (
					<File
						size={15}
						color="var(--text-secondary)"
					/>
				)}
			</div>
			<div style={{ flex: 1, minWidth: 0 }}>
				<div
					style={{
						fontWeight: 600,
						fontSize: '0.82rem',
						whiteSpace: 'nowrap',
						overflow: 'hidden',
						textOverflow: 'ellipsis',
					}}
					title={doc.filename}
				>
					{doc.display_name}
				</div>
				<div
					style={{
						fontSize: '0.7rem',
						color: 'var(--text-secondary)',
						marginTop: '0.1rem',
					}}
				>
					{formatBytes(doc.size_bytes)}
					{doc.is_web_result && (
						<span
							style={{
								marginLeft: '0.5rem',
								padding: '0.1rem 0.45rem',
								borderRadius: '999px',
								background: 'rgba(37,99,235,0.1)',
								color: 'var(--accent-color)',
								fontWeight: 700,
								fontSize: '0.65rem',
							}}
						>
							WEB
						</span>
					)}
				</div>
			</div>
		</div>
	);

	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				gap: '1rem',
				flex: 1,
				overflowY: 'auto',
			}}
		>
			{/* Uploaded documents */}
			<div>
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: '0.4rem',
						fontSize: '0.73rem',
						fontWeight: 700,
						color: 'var(--text-secondary)',
						textTransform: 'uppercase',
						letterSpacing: '0.05em',
						marginBottom: '0.5rem',
					}}
				>
					<FolderOpen size={13} />
					Uploaded ({userDocs.length})
				</div>
				{userDocs.length === 0 ? (
					<div
						style={{
							fontSize: '0.8rem',
							color: 'var(--text-secondary)',
							padding: '0.5rem 0',
						}}
					>
						No uploaded files.
					</div>
				) : (
					<div
						style={{
							display: 'flex',
							flexDirection: 'column',
							gap: '0.4rem',
						}}
					>
						{userDocs.map((d) => (
							<DocRow
								key={d.filename}
								doc={d}
							/>
						))}
					</div>
				)}
			</div>

			{/* Web search results */}
			<div>
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: '0.4rem',
						fontSize: '0.73rem',
						fontWeight: 700,
						color: 'var(--text-secondary)',
						textTransform: 'uppercase',
						letterSpacing: '0.05em',
						marginBottom: '0.5rem',
					}}
				>
					<Globe size={13} />
					Web Search Results ({webDocs.length})
				</div>
				{webDocs.length === 0 ? (
					<div
						style={{
							fontSize: '0.8rem',
							color: 'var(--text-secondary)',
							padding: '0.5rem 0',
						}}
					>
						No web search results. Enable{' '}
						<em>Web Search Grounding</em> when creating a new
						simulation.
					</div>
				) : (
					<div
						style={{
							display: 'flex',
							flexDirection: 'column',
							gap: '0.4rem',
						}}
					>
						{webDocs.map((d) => (
							<DocRow
								key={d.filename}
								doc={d}
							/>
						))}
					</div>
				)}
			</div>
		</div>
	);
}

// ─── Session Reports Tab ──────────────────────────────────────────────────────
function SessionReportsList({ sessionId, onCountChange, scenarios = [] }) {
	const [reports, setReports] = useState([]);
	const [loading, setLoading] = useState(true);
	const [selected, setSelected] = useState(null);
	const [content, setContent] = useState(null);
	const [contentLoading, setContentLoading] = useState(false);
	const [deleting, setDeleting] = useState(null);
	const [showModal, setShowModal] = useState(false);

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

	const handleReportCreated = (newReport) => {
		setReports((prev) => [newReport, ...prev]);
		onCountChange(reports.length + 1);
		openReport(newReport);
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
			{showModal && (
				<CreateReportModal
					sessionId={sessionId}
					scenarios={scenarios}
					onClose={() => setShowModal(false)}
					onCreated={handleReportCreated}
				/>
			)}
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
				<button
					className="btn"
					onClick={() => setShowModal(true)}
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: '0.4rem',
						fontSize: '0.8rem',
						padding: '0.45rem 0.85rem',
						alignSelf: 'flex-end',
						flexShrink: 0,
					}}
				>
					<Plus size={13} />
					Generate Report
				</button>
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

function PostCard({ post, comments, agentMap, isScenarioPost }) {
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
				background: isScenarioPost
					? 'rgba(124,58,237,0.04)'
					: 'var(--surface-container-low)',
				border: `1px solid ${isScenarioPost ? 'rgba(124,58,237,0.35)' : 'var(--outline-variant)'}`,
				borderRadius: '12px',
				overflow: 'hidden',
				flexShrink: 0,
			}}
		>
			{isScenarioPost && (
				<div
					style={{
						background: 'rgba(124,58,237,0.12)',
						padding: '0.2rem 0.85rem',
						fontSize: '0.67rem',
						fontWeight: 700,
						color: '#7c3aed',
						letterSpacing: '0.04em',
						textTransform: 'uppercase',
					}}
				>
					◆ Scenario Post
				</div>
			)}
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

function SocialFeed({ sessionId, scenarioId }) {
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		setLoading(true);
		setData(null);
		const endpoint = scenarioId
			? `/scenarios/${scenarioId}/feed`
			: `/simulation/feed/${sessionId}`;
		api.get(endpoint)
			.then((r) => setData(r.data))
			.catch(() => setData({ posts: [], comments: [], agents: [] }))
			.finally(() => setLoading(false));
	}, [sessionId, scenarioId]);

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
					display: 'flex',
					alignItems: 'center',
					gap: '0.5rem',
					flexWrap: 'wrap',
				}}
			>
				{posts.length} post{posts.length !== 1 ? 's' : ''} ·{' '}
				{comments.length} comment{comments.length !== 1 ? 's' : ''}
				{scenarioId && (
					<span
						style={{
							padding: '0.1rem 0.5rem',
							borderRadius: '999px',
							background: 'rgba(124,58,237,0.1)',
							color: '#7c3aed',
							fontWeight: 700,
						}}
					>
						◆ scenario posts highlighted
					</span>
				)}
			</div>
			{posts.map((post, i) => {
				const postId = getVal(post, 'post_id', 'id') ?? i;
				return (
					<PostCard
						key={postId}
						post={post}
						comments={commentsByPost[postId] || []}
						agentMap={agentMap}
						isScenarioPost={post._source === 'scenario'}
					/>
				);
			})}
		</div>
	);
}

// ─── Create Scenario Modal ────────────────────────────────────────────────────
function CreateScenarioModal({ sessionId, onClose, onCreated }) {
	const [name, setName] = useState('');
	const [description, setDescription] = useState('');
	const [rounds, setRounds] = useState(1);
	const [creating, setCreating] = useState(false);
	const [error, setError] = useState(null);

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (!name.trim() || !description.trim()) return;
		setCreating(true);
		setError(null);
		try {
			const res = await api.post(`/scenarios/session/${sessionId}`, {
				name: name.trim(),
				description: description.trim(),
				rounds: Number(rounds) || 1,
			});
			onCreated(res.data);
			onClose();
		} catch (err) {
			setError(
				err?.response?.data?.detail || 'Failed to create scenario.',
			);
		} finally {
			setCreating(false);
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
						<FlaskConical
							size={20}
							color="var(--accent-color)"
						/>
						<h3 style={{ margin: 0, fontSize: '1rem' }}>
							New Scenario
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
							padding: '0.25rem',
							borderRadius: '6px',
						}}
					>
						<X size={18} />
					</button>
				</div>

				<p
					style={{
						margin: 0,
						fontSize: '0.85rem',
						color: 'var(--text-secondary)',
						lineHeight: 1.6,
					}}
				>
					Define a "what-if" scenario. Agents will react to the new
					situation — building on the same profiles and knowledge
					graph.
				</p>

				<form
					onSubmit={handleSubmit}
					style={{
						display: 'flex',
						flexDirection: 'column',
						gap: '1rem',
					}}
				>
					<div>
						<label
							style={{
								fontSize: '0.78rem',
								fontWeight: 600,
								color: 'var(--text-secondary)',
								display: 'block',
								marginBottom: '0.35rem',
							}}
						>
							Scenario Name
						</label>
						<input
							className="input-field"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="e.g. USA Wins — China-Russia Alliance"
							disabled={creating}
							style={{ width: '100%', boxSizing: 'border-box' }}
						/>
					</div>
					<div>
						<label
							style={{
								fontSize: '0.78rem',
								fontWeight: 600,
								color: 'var(--text-secondary)',
								display: 'block',
								marginBottom: '0.35rem',
							}}
						>
							Scenario Description
						</label>
						<textarea
							className="input-field"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="e.g. Let's say the USA won the conflict, but China and Russia formed a new strategic alliance in response…"
							rows={4}
							disabled={creating}
							style={{
								resize: 'vertical',
								fontFamily: 'inherit',
								fontSize: '0.88rem',
								lineHeight: 1.6,
								width: '100%',
								boxSizing: 'border-box',
							}}
						/>
					</div>
					<div>
						<label
							style={{
								fontSize: '0.78rem',
								fontWeight: 600,
								color: 'var(--text-secondary)',
								display: 'block',
								marginBottom: '0.35rem',
							}}
						>
							Rounds / Iterations
						</label>
						<input
							type="number"
							className="input-field"
							value={rounds}
							onChange={(e) => setRounds(e.target.value)}
							min={1}
							max={20}
							disabled={creating}
							style={{ width: '120px' }}
						/>
					</div>

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
							disabled={creating}
						>
							Cancel
						</button>
						<button
							type="submit"
							className="btn"
							disabled={
								creating || !name.trim() || !description.trim()
							}
							style={{
								display: 'flex',
								alignItems: 'center',
								gap: '0.45rem',
							}}
						>
							{creating ? (
								<>
									<RefreshCw
										size={14}
										style={{
											animation:
												'spin 1.4s linear infinite',
										}}
									/>{' '}
									Creating…
								</>
							) : (
								<>
									<FlaskConical size={14} /> Create Scenario
								</>
							)}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}

// ─── Scenario Card ────────────────────────────────────────────────────────────
function ScenarioCard({ scenario, onRun, onGenerateReport, liveLog }) {
	const [showLog, setShowLog] = useState(false);

	const statusColors = {
		completed: { bg: '#dcfce7', color: '#16a34a' },
		running: { bg: '#dbeafe', color: '#2563eb' },
		error: { bg: '#fee2e2', color: '#dc2626' },
		created: { bg: '#f3f4f6', color: '#6b7280' },
	};
	const pill = statusColors[scenario.status] || statusColors.created;

	return (
		<div
			style={{
				background: 'var(--surface-container-low)',
				border: '1px solid var(--outline-variant)',
				borderRadius: '10px',
				padding: '1rem',
				display: 'flex',
				flexDirection: 'column',
				gap: '0.65rem',
			}}
		>
			{/* Header */}
			<div
				style={{
					display: 'flex',
					alignItems: 'flex-start',
					gap: '0.6rem',
				}}
			>
				<FlaskConical
					size={16}
					color="var(--accent-color)"
					style={{ marginTop: '0.15rem', flexShrink: 0 }}
				/>
				<div style={{ flex: 1, minWidth: 0 }}>
					<div
						style={{
							fontWeight: 700,
							fontSize: '0.88rem',
							display: 'flex',
							alignItems: 'center',
							gap: '0.5rem',
							flexWrap: 'wrap',
						}}
					>
						{scenario.name}
						<span
							style={{
								padding: '0.1rem 0.5rem',
								borderRadius: '999px',
								fontSize: '0.65rem',
								fontWeight: 700,
								background: pill.bg,
								color: pill.color,
								textTransform: 'uppercase',
								letterSpacing: '0.04em',
							}}
						>
							{scenario.status}
						</span>
					</div>
					<div
						style={{
							fontSize: '0.78rem',
							color: 'var(--text-secondary)',
							marginTop: '0.2rem',
							lineHeight: 1.5,
						}}
					>
						{scenario.description}
					</div>
					<div
						style={{
							fontSize: '0.7rem',
							color: 'var(--text-secondary)',
							marginTop: '0.25rem',
						}}
					>
						{scenario.rounds} round
						{scenario.rounds !== 1 ? 's' : ''} · Created{' '}
						{new Date(scenario.created_at).toLocaleString()}
					</div>
				</div>
			</div>

			{/* Running log snippet */}
			{scenario.status === 'running' && (
				<div>
					<button
						onClick={() => setShowLog((v) => !v)}
						style={{
							background: 'none',
							border: 'none',
							cursor: 'pointer',
							fontSize: '0.72rem',
							color: 'var(--text-secondary)',
							display: 'flex',
							alignItems: 'center',
							gap: '0.3rem',
							padding: 0,
							marginBottom: '0.35rem',
						}}
					>
						{showLog ? (
							<ChevronUp size={12} />
						) : (
							<ChevronDown size={12} />
						)}
						{showLog ? 'Hide' : 'Show'} live log
					</button>
					{showLog && (
						<div
							style={{
								background: 'var(--primary)',
								borderRadius: '6px',
								padding: '0.6rem 0.75rem',
								fontFamily: 'monospace',
								fontSize: '0.72rem',
								lineHeight: 1.6,
								color: 'var(--primary-fixed)',
								maxHeight: '120px',
								overflowY: 'auto',
							}}
						>
							{(liveLog || []).length === 0 ? (
								<span style={{ color: '#8c7c6c' }}>
									Waiting for events…
								</span>
							) : (
								(liveLog || []).map((ev, i) => (
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
															: '#d4c8bc',
										}}
									>
										› {ev.message}
									</div>
								))
							)}
						</div>
					)}
				</div>
			)}

			{/* Actions */}
			<div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
				{(scenario.status === 'created' ||
					scenario.status === 'error') && (
					<button
						className="btn"
						onClick={() => onRun(scenario)}
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: '0.35rem',
							fontSize: '0.78rem',
							padding: '0.45rem 0.85rem',
						}}
					>
						<Play size={13} />
						Run Scenario
					</button>
				)}
				{scenario.status === 'completed' && (
					<button
						className="btn btn-secondary"
						onClick={() => onGenerateReport(scenario)}
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: '0.35rem',
							fontSize: '0.78rem',
							padding: '0.45rem 0.85rem',
						}}
					>
						<FileText size={13} />
						Generate Scenario Report
					</button>
				)}
			</div>
		</div>
	);
}

// ─── Resimulate Modal ─────────────────────────────────────────────────────────
function ResimulateModal({ sessionUuid, session, onClose, onSuccess }) {
	const [seedInfo, setSeedInfo] = useState(null);
	const [loadingInfo, setLoadingInfo] = useState(true);
	const [rounds, setRounds] = useState(3);
	const [agentSlider, setAgentSlider] = useState(0);
	const [objective, setObjective] = useState('');
	const [existingFiles, setExistingFiles] = useState([]);
	const [filesToRemove, setFilesToRemove] = useState(new Set());
	const [newFiles, setNewFiles] = useState([]);
	const [useWebSearch, setUseWebSearch] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState(null);
	const [dragging, setDragging] = useState(false);
	const fileInputRef = useRef(null);

	const getAgentCount = (v) => [0, 50, 150, 300, 500][v];
	const isFailed = session?.status === 'error';

	useEffect(() => {
		api.get(`/simulation/seed-info/${sessionUuid}`)
			.then((res) => {
				setSeedInfo(res.data);
				setRounds(res.data.rounds || 3);
				setObjective(res.data.objective || '');
				// Only show user-uploaded files (backend now excludes _web_results.md)
				setExistingFiles(res.data.files || []);
			})
			.catch(() => {})
			.finally(() => setLoadingInfo(false));
	}, [sessionUuid]);

	const toggleRemove = (fname) => {
		setFilesToRemove((prev) => {
			const next = new Set(prev);
			next.has(fname) ? next.delete(fname) : next.add(fname);
			return next;
		});
	};

	const keptCount =
		existingFiles.filter((f) => !filesToRemove.has(f)).length +
		newFiles.length;

	const handleDrop = (e) => {
		e.preventDefault();
		setDragging(false);
		const dropped = Array.from(e.dataTransfer.files);
		if (dropped.length) setNewFiles((prev) => [...prev, ...dropped]);
	};

	const handleSubmit = async () => {
		if (keptCount === 0) {
			setError('At least one seed file is required.');
			return;
		}
		setSubmitting(true);
		setError(null);
		try {
			const formData = new FormData();
			formData.append('rounds', rounds);
			const agentCount = getAgentCount(agentSlider);
			if (agentCount > 0) formData.append('agent_count', agentCount);
			if (objective.trim())
				formData.append('objective', objective.trim());
			formData.append('enable_web_search', useWebSearch);
			if (filesToRemove.size > 0)
				formData.append(
					'remove_files',
					JSON.stringify(Array.from(filesToRemove)),
				);
			newFiles.forEach((f) => formData.append('add_files', f));
			await api.post(`/simulation/resimulate/${sessionUuid}`, formData, {
				headers: { 'Content-Type': 'multipart/form-data' },
			});
			onSuccess();
		} catch (err) {
			setError(
				err?.response?.data?.detail ||
					'Resimulate failed. See console.',
			);
			console.error(err);
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div
			style={{
				position: 'fixed',
				inset: 0,
				background: 'rgba(0,0,0,0.50)',
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
					maxWidth: '600px',
					maxHeight: '90vh',
					overflowY: 'auto',
					display: 'flex',
					flexDirection: 'column',
					gap: '1.25rem',
					boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
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
						<RefreshCw
							size={20}
							color={isFailed ? '#d97706' : 'var(--accent-color)'}
						/>
						<h3 style={{ margin: 0, fontSize: '1rem' }}>
							Resimulate
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

				{/* Warning banner */}
				<div
					style={{
						background: isFailed ? '#fef3c7' : '#eff6ff',
						border: `1px solid ${isFailed ? '#fcd34d' : '#bfdbfe'}`,
						borderRadius: '10px',
						padding: '0.85rem 1rem',
						fontSize: '0.82rem',
						color: isFailed ? '#92400e' : '#1e40af',
						lineHeight: 1.5,
					}}
				>
					{isFailed
						? '⚠️ The previous simulation failed. This will clear all generated data and retry with the settings below.'
						: 'This will permanently clear all posts, reports, scenarios, and generated data for this simulation and re-run it from scratch. Your seed files will be preserved unless you change them below.'}
				</div>

				{loadingInfo ? (
					<p
						style={{
							color: 'var(--text-secondary)',
							fontSize: '0.85rem',
						}}
					>
						Loading current configuration…
					</p>
				) : (
					<>
						{/* Seed files */}
						<div
							style={{
								display: 'flex',
								flexDirection: 'column',
								gap: '0.5rem',
							}}
						>
							<label
								style={{
									fontSize: '0.78rem',
									fontWeight: 600,
									color: 'var(--text-secondary)',
									textTransform: 'uppercase',
									letterSpacing: '0.05em',
								}}
							>
								Seed Files
							</label>

							{existingFiles.length > 0 && (
								<div
									style={{
										display: 'flex',
										flexDirection: 'column',
										gap: '0.3rem',
									}}
								>
									{existingFiles.map((fname) => (
										<div
											key={fname}
											style={{
												display: 'flex',
												alignItems: 'center',
												justifyContent: 'space-between',
												padding: '0.45rem 0.65rem',
												background: filesToRemove.has(
													fname,
												)
													? '#fee2e2'
													: 'var(--surface-container-high)',
												borderRadius: '8px',
												fontSize: '0.82rem',
												textDecoration:
													filesToRemove.has(fname)
														? 'line-through'
														: 'none',
												color: filesToRemove.has(fname)
													? '#dc2626'
													: 'var(--text-primary)',
												transition: 'all 0.15s',
											}}
										>
											<span
												style={{
													wordBreak: 'break-all',
												}}
											>
												{fname}
											</span>
											<button
												onClick={() =>
													toggleRemove(fname)
												}
												title={
													filesToRemove.has(fname)
														? 'Keep this file'
														: 'Remove this file'
												}
												style={{
													background: 'none',
													border: 'none',
													cursor: 'pointer',
													color: filesToRemove.has(
														fname,
													)
														? '#16a34a'
														: '#dc2626',
													display: 'flex',
													alignItems: 'center',
													flexShrink: 0,
													marginLeft: '0.5rem',
													padding: '0.15rem',
												}}
											>
												{filesToRemove.has(fname) ? (
													<Plus size={14} />
												) : (
													<X size={14} />
												)}
											</button>
										</div>
									))}
								</div>
							)}

							{/* Drop zone for adding new files */}
							<div
								onDrop={handleDrop}
								onDragOver={(e) => {
									e.preventDefault();
									setDragging(true);
								}}
								onDragLeave={() => setDragging(false)}
								onClick={() => fileInputRef.current?.click()}
								style={{
									border: `2px dashed ${dragging ? 'var(--accent-color)' : 'var(--outline-variant)'}`,
									borderRadius: '10px',
									padding: '1rem',
									textAlign: 'center',
									cursor: 'pointer',
									background: dragging
										? 'var(--surface-container-low)'
										: 'transparent',
									transition: 'all 0.15s ease',
									fontSize: '0.8rem',
									color: 'var(--text-secondary)',
								}}
							>
								{newFiles.length > 0 ? (
									<span
										style={{
											fontWeight: 500,
											color: 'var(--on-surface)',
										}}
									>
										+ {newFiles.length} new file
										{newFiles.length > 1 ? 's' : ''} to add
									</span>
								) : (
									'Drop files here or click to add more seed files'
								)}
								<input
									ref={fileInputRef}
									type="file"
									multiple
									style={{ display: 'none' }}
									onChange={(e) =>
										setNewFiles((prev) => [
											...prev,
											...Array.from(e.target.files),
										])
									}
								/>
							</div>

							{keptCount === 0 && (
								<p
									style={{
										fontSize: '0.75rem',
										color: '#dc2626',
										margin: 0,
									}}
								>
									At least one seed file is required.
								</p>
							)}
						</div>

						{/* Rounds */}
						<div
							style={{
								display: 'flex',
								flexDirection: 'column',
								gap: '0.4rem',
							}}
						>
							<label
								style={{
									fontSize: '0.78rem',
									fontWeight: 600,
									color: 'var(--text-secondary)',
									textTransform: 'uppercase',
									letterSpacing: '0.05em',
								}}
							>
								Iterations / Rounds
							</label>
							<input
								type="number"
								min="1"
								max="100"
								className="input-field"
								value={rounds}
								onChange={(e) =>
									setRounds(Number(e.target.value))
								}
							/>
						</div>

						{/* Agent slider */}
						<div
							style={{
								display: 'flex',
								flexDirection: 'column',
								gap: '0.4rem',
							}}
						>
							<label
								style={{
									fontSize: '0.78rem',
									fontWeight: 600,
									color: 'var(--text-secondary)',
									textTransform: 'uppercase',
									letterSpacing: '0.05em',
								}}
							>
								Force Add Agents
							</label>
							<input
								type="range"
								min="0"
								max="4"
								step="1"
								value={agentSlider}
								onChange={(e) =>
									setAgentSlider(Number(e.target.value))
								}
								style={{ width: '100%', cursor: 'pointer' }}
							/>
							<div
								style={{
									display: 'flex',
									justifyContent: 'space-between',
									fontSize: '0.7rem',
									color: 'var(--text-secondary)',
								}}
							>
								{['Natural', '50', '150', '300', '500'].map(
									(label, i) => (
										<span
											key={label}
											style={{
												fontWeight:
													agentSlider === i
														? 600
														: 400,
											}}
										>
											{label}
										</span>
									),
								)}
							</div>
							<div
								style={{
									textAlign: 'center',
									fontSize: '0.8rem',
									fontWeight: 600,
									color: 'var(--accent-color)',
								}}
							>
								{agentSlider === 0
									? 'Generate naturally from input'
									: `Force inflate to ${getAgentCount(agentSlider)} agents`}
							</div>
						</div>

						{/* Objective */}
						<div
							style={{
								display: 'flex',
								flexDirection: 'column',
								gap: '0.4rem',
							}}
						>
							<label
								style={{
									fontSize: '0.78rem',
									fontWeight: 600,
									color: 'var(--text-secondary)',
									textTransform: 'uppercase',
									letterSpacing: '0.05em',
								}}
							>
								Investigation Objective{' '}
								<span
									style={{
										fontWeight: 400,
										textTransform: 'none',
									}}
								>
									(optional)
								</span>
							</label>
							<textarea
								className="input-field"
								placeholder="e.g. Understand how employees react to a 20% salary cut"
								value={objective}
								onChange={(e) => setObjective(e.target.value)}
								rows={2}
								style={{
									resize: 'vertical',
									fontFamily: 'inherit',
									lineHeight: 1.5,
								}}
							/>
						</div>

						{/* Web Search Grounding */}
						<div
							style={{
								display: 'flex',
								alignItems: 'flex-start',
								gap: '0.75rem',
								padding: '0.85rem 1rem',
								background: useWebSearch
									? 'rgba(var(--accent-rgb, 99,102,241), 0.08)'
									: 'var(--surface-container-high)',
								border: `1px solid ${useWebSearch ? 'var(--accent-color)' : 'var(--outline-variant)'}`,
								borderRadius: '10px',
								cursor: 'pointer',
								transition: 'all 0.15s',
							}}
							onClick={() => setUseWebSearch((v) => !v)}
						>
							<input
								type="checkbox"
								id="web-search-checkbox"
								checked={useWebSearch}
								onChange={(e) =>
									setUseWebSearch(e.target.checked)
								}
								onClick={(e) => e.stopPropagation()}
								style={{
									marginTop: '0.15rem',
									accentColor: 'var(--accent-color)',
									width: '15px',
									height: '15px',
									flexShrink: 0,
									cursor: 'pointer',
								}}
							/>
							<div>
								<label
									htmlFor="web-search-checkbox"
									style={{
										fontSize: '0.85rem',
										fontWeight: 600,
										color: 'var(--text-primary)',
										cursor: 'pointer',
									}}
								>
									Web Search Grounding
								</label>
								<p
									style={{
										margin: '0.2rem 0 0',
										fontSize: '0.78rem',
										color: 'var(--text-secondary)',
										lineHeight: 1.4,
									}}
								>
									Enrich seed documents with live web search
									results before running the simulation.
								</p>
							</div>
						</div>
					</>
				)}

				{error && (
					<p
						style={{
							margin: 0,
							fontSize: '0.82rem',
							color: '#dc2626',
							background: '#fee2e2',
							padding: '0.6rem 0.85rem',
							borderRadius: '8px',
						}}
					>
						{error}
					</p>
				)}

				{/* Actions */}
				<div
					style={{
						display: 'flex',
						gap: '0.75rem',
						justifyContent: 'flex-end',
					}}
				>
					<button
						onClick={onClose}
						disabled={submitting}
						style={{
							padding: '0.55rem 1.1rem',
							borderRadius: '8px',
							border: '1px solid var(--outline-variant)',
							background: 'transparent',
							cursor: 'pointer',
							fontSize: '0.85rem',
							color: 'var(--text-secondary)',
						}}
					>
						Cancel
					</button>
					<button
						onClick={handleSubmit}
						disabled={submitting || loadingInfo || keptCount === 0}
						style={{
							padding: '0.55rem 1.25rem',
							borderRadius: '8px',
							border: 'none',
							background: isFailed
								? '#d97706'
								: 'var(--accent-color)',
							color: '#fff',
							fontWeight: 700,
							cursor:
								submitting || loadingInfo || keptCount === 0
									? 'not-allowed'
									: 'pointer',
							fontSize: '0.85rem',
							display: 'flex',
							alignItems: 'center',
							gap: '0.4rem',
							opacity:
								submitting || loadingInfo || keptCount === 0
									? 0.65
									: 1,
						}}
					>
						<RefreshCw size={14} />
						{submitting ? 'Starting…' : 'Resimulate'}
					</button>
				</div>
			</div>
		</div>
	);
}

// ─── Create Report Modal ──────────────────────────────────────────────────────
function CreateReportModal({ sessionId, scenarios = [], onClose, onCreated }) {
	const [description, setDescription] = useState('');
	const [selectedSource, setSelectedSource] = useState('main');
	const [generating, setGenerating] = useState(false);
	const [error, setError] = useState(null);

	const completedScenarios = scenarios.filter(
		(s) => s.status === 'completed',
	);

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (!description.trim()) return;
		setGenerating(true);
		setError(null);
		try {
			let res;
			if (selectedSource !== 'main') {
				res = await api.post(`/scenarios/${selectedSource}/report`, {
					description: description.trim(),
				});
			} else {
				res = await api.post(`/reports/generate/${sessionId}`, {
					description: description.trim(),
				});
			}
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
					{completedScenarios.length > 0 && (
						<div>
							<label
								style={{
									fontSize: '0.78rem',
									fontWeight: 600,
									color: 'var(--text-secondary)',
									display: 'block',
									marginBottom: '0.4rem',
								}}
							>
								Report Context
							</label>
							<div
								style={{
									display: 'flex',
									gap: '0.4rem',
									flexWrap: 'wrap',
								}}
							>
								<button
									type="button"
									onClick={() => setSelectedSource('main')}
									style={{
										padding: '0.3rem 0.75rem',
										borderRadius: '999px',
										border: `1.5px solid ${selectedSource === 'main' ? 'var(--accent-color)' : 'var(--outline-variant)'}`,
										background:
											selectedSource === 'main'
												? 'var(--accent-color)'
												: 'transparent',
										color:
											selectedSource === 'main'
												? '#fff'
												: 'var(--text-secondary)',
										cursor: 'pointer',
										fontSize: '0.78rem',
										fontWeight: 600,
										transition: 'all 0.15s',
									}}
								>
									Main Simulation
								</button>
								{completedScenarios.map((s) => (
									<button
										key={s.scenario_id}
										type="button"
										onClick={() =>
											setSelectedSource(s.scenario_id)
										}
										style={{
											padding: '0.3rem 0.75rem',
											borderRadius: '999px',
											border: `1.5px solid ${selectedSource === s.scenario_id ? '#7c3aed' : 'var(--outline-variant)'}`,
											background:
												selectedSource === s.scenario_id
													? '#7c3aed'
													: 'transparent',
											color:
												selectedSource === s.scenario_id
													? '#fff'
													: 'var(--text-secondary)',
											cursor: 'pointer',
											fontSize: '0.78rem',
											fontWeight: 600,
											transition: 'all 0.15s',
										}}
									>
										◆ {s.name}
									</button>
								))}
							</div>
						</div>
					)}
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

// ─── Scenario Report Modal ────────────────────────────────────────────────────
function ScenarioReportModal({ scenario, onClose, onCreated }) {
	const [description, setDescription] = useState('');
	const [generating, setGenerating] = useState(false);
	const [error, setError] = useState(null);

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (!description.trim()) return;
		setGenerating(true);
		setError(null);
		try {
			const res = await api.post(
				`/scenarios/${scenario.scenario_id}/report`,
				{
					description: description.trim(),
				},
			);
			onCreated(res.data);
			onClose();
		} catch (err) {
			setError(
				err?.response?.data?.detail ||
					'Failed to generate scenario report.',
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
							Generate Scenario Report
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
							padding: '0.25rem',
							borderRadius: '6px',
						}}
					>
						<X size={18} />
					</button>
				</div>
				<div
					style={{
						padding: '0.65rem 0.85rem',
						background: 'rgba(37,99,235,0.06)',
						border: '1px solid rgba(37,99,235,0.15)',
						borderRadius: '8px',
						fontSize: '0.82rem',
						color: 'var(--accent-color)',
					}}
				>
					<strong>Scenario:</strong> {scenario.name} —{' '}
					{scenario.description}
				</div>
				<p
					style={{
						margin: 0,
						fontSize: '0.85rem',
						color: 'var(--text-secondary)',
						lineHeight: 1.6,
					}}
				>
					Describe what you want the report to focus on. The agent
					will analyse how this scenario changes dynamics, what
					improved or worsened, and how real-world users might react.
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
						placeholder="e.g. How does this scenario shift power dynamics? What narratives emerge? How might the public react?"
						rows={4}
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
									/>{' '}
									Generating…
								</>
							) : (
								<>
									<FileText size={14} /> Generate Report
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
	const [showResimulateModal, setShowResimulateModal] = useState(false);
	const [reportsCount, setReportsCount] = useState(0);

	// Scenario state
	const [scenarios, setScenarios] = useState([]);
	const [showCreateScenario, setShowCreateScenario] = useState(false);
	const [selectedPill, setSelectedPill] = useState('main'); // 'main' or scenario_id (used in non-chat tabs only)
	const [scenarioLiveLogs, setScenarioLiveLogs] = useState({}); // { scenario_uuid: [...events] }
	const [scenarioReportTarget, setScenarioReportTarget] = useState(null);

	// Chat hashtag autocomplete
	const [chatTags, setChatTags] = useState([]); // [{tag, label, type}]
	const [acSuggestions, setAcSuggestions] = useState([]);
	const [acTagStart, setAcTagStart] = useState(-1);
	const queryInputRef = useRef(null);

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
			scenariosCount: scenarios.length,
			session,
			onCreateReport:
				session?.status === 'completed'
					? () => setShowReportModal(true)
					: null,
			onResimulate:
				session?.status === 'completed' || session?.status === 'error'
					? () => setShowResimulateModal(true)
					: null,
		});
		return () => setSessionNav(null);
	}, [activeTab, artifacts, session, reportsCount, scenarios]);

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
				// Fetch scenarios
				try {
					const scenRes = await api.get(`/scenarios/session/${id}`);
					setScenarios(scenRes.data || []);
				} catch {
					/* non-fatal */
				}
				// Fetch hashtag autocomplete tags
				try {
					const tagsRes = await api.get(`/simulation/tags/${id}`);
					setChatTags(tagsRes.data?.tags || []);
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

	const fetchScenarios = async () => {
		try {
			const res = await api.get(`/scenarios/session/${id}`);
			setScenarios(res.data || []);
			// Refresh tags so newly completed scenarios appear in autocomplete
			try {
				const tagsRes = await api.get(`/simulation/tags/${id}`);
				setChatTags(tagsRes.data?.tags || []);
			} catch {
				/* non-fatal */
			}
		} catch {
			/* noop */
		}
	};

	const handleRunScenario = async (scenario) => {
		try {
			await api.post(`/scenarios/${scenario.scenario_id}/run`);
			// Update local state optimistically
			setScenarios((prev) =>
				prev.map((s) =>
					s.scenario_id === scenario.scenario_id
						? { ...s, status: 'running' }
						: s,
				),
			);
			// Start SSE stream
			_startScenarioStream(scenario.scenario_id);
		} catch (err) {
			alert(err?.response?.data?.detail || 'Failed to run scenario.');
		}
	};

	const _startScenarioStream = (scenarioId) => {
		const token = localStorage.getItem('token');
		const base =
			import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
		const url = `${base}/scenarios/${scenarioId}/stream?token=${encodeURIComponent(token)}`;
		const es = new EventSource(url);
		es.onmessage = (e) => {
			try {
				const ev = JSON.parse(e.data);
				setScenarioLiveLogs((prev) => ({
					...prev,
					[scenarioId]: [...(prev[scenarioId] || []), ev],
				}));
				if (ev.type === 'done' || ev.type === 'error') {
					es.close();
					// Refresh scenarios list to get updated status
					setTimeout(() => fetchScenarios(), 800);
				}
			} catch {
				/* noop */
			}
		};
		es.onerror = () => es.close();
	};

	const handleQueryChange = (e) => {
		const val = e.target.value;
		setQuery(val);

		// Detect if cursor is immediately after a #word
		const cursor = e.target.selectionStart ?? val.length;
		const before = val.slice(0, cursor);
		const hashMatch = before.match(/#(\w*)$/);

		if (hashMatch && chatTags.length > 0) {
			const partial = hashMatch[1].toLowerCase();
			const filtered = chatTags.filter(
				(t) =>
					t.tag.startsWith(partial) ||
					t.label.toLowerCase().includes(partial),
			);
			setAcSuggestions(filtered.slice(0, 8));
			setAcTagStart(hashMatch.index);
		} else {
			setAcSuggestions([]);
			setAcTagStart(-1);
		}
	};

	const handleAcSelect = (tagItem) => {
		const cursor = queryInputRef.current?.selectionStart ?? query.length;
		const before = query.slice(0, cursor);
		const after = query.slice(cursor);
		const hashIdx = before.lastIndexOf('#');
		const newQuery =
			before.slice(0, hashIdx) + '#' + tagItem.tag + ' ' + after;
		setQuery(newQuery);
		setAcSuggestions([]);
		setAcTagStart(-1);
		setTimeout(() => queryInputRef.current?.focus(), 0);
	};

	const handleChat = async (e) => {
		e.preventDefault();
		if (!query.trim()) return;
		const userQ = query;
		setQuery('');
		setAcSuggestions([]);
		setMessages((prev) => [
			...prev,
			{ text: userQ, is_user: true, id: Date.now() },
		]);
		setChatLoading(true);
		try {
			const formData = new URLSearchParams();
			formData.append('query', userQ);
			// Always use the global simulation chat endpoint
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
					scenarios={scenarios}
					onClose={() => setShowReportModal(false)}
					onCreated={() => {}}
				/>
			)}

			{showResimulateModal && session && (
				<ResimulateModal
					sessionUuid={id}
					session={session}
					onClose={() => setShowResimulateModal(false)}
					onSuccess={() => {
						setShowResimulateModal(false);
						fetchData();
					}}
				/>
			)}

			{showCreateScenario && session && (
				<CreateScenarioModal
					sessionId={id}
					onClose={() => setShowCreateScenario(false)}
					onCreated={(newScenario) => {
						setScenarios((prev) => [...prev, newScenario]);
					}}
				/>
			)}

			{scenarioReportTarget && (
				<ScenarioReportModal
					scenario={scenarioReportTarget}
					onClose={() => setScenarioReportTarget(null)}
					onCreated={() => {
						setScenarioReportTarget(null);
					}}
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
						width:
							activeTab === 'insights' || activeTab === 'reports'
								? '70%'
								: '42%',
						transition: 'width 0.3s ease',
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
							{/* ── Scenario pill bar (shown on feed, scenarios, and insights tabs) ── */}
							{scenarios.length > 0 &&
								(activeTab === 'feed' ||
									activeTab === 'scenarios' ||
									activeTab === 'insights') && (
									<div
										style={{
											display: 'flex',
											gap: '0.4rem',
											flexWrap: 'wrap',
											alignItems: 'center',
										}}
									>
										<Tag
											size={13}
											color="var(--text-secondary)"
											style={{ flexShrink: 0 }}
										/>
										{/* Main pill */}
										<button
											onClick={() => {
												setSelectedPill('main');
											}}
											style={{
												padding: '0.2rem 0.75rem',
												borderRadius: '999px',
												fontSize: '0.72rem',
												fontWeight: 700,
												border: `1.5px solid ${selectedPill === 'main' ? 'var(--accent-color)' : 'var(--outline-variant)'}`,
												background:
													selectedPill === 'main'
														? 'var(--accent-color)'
														: 'transparent',
												color:
													selectedPill === 'main'
														? '#fff'
														: 'var(--text-secondary)',
												cursor: 'pointer',
												transition: 'all 0.15s',
											}}
										>
											Main
										</button>
										{/* Scenario pills */}
										{scenarios.map((s) => (
											<button
												key={s.scenario_id}
												onClick={() => {
													setSelectedPill(
														s.scenario_id,
													);
												}}
												title={s.description}
												style={{
													padding: '0.2rem 0.75rem',
													borderRadius: '999px',
													fontSize: '0.72rem',
													fontWeight: 700,
													border: `1.5px solid ${selectedPill === s.scenario_id ? '#7c3aed' : 'var(--outline-variant)'}`,
													background:
														selectedPill ===
														s.scenario_id
															? '#7c3aed'
															: 'transparent',
													color:
														selectedPill ===
														s.scenario_id
															? '#fff'
															: 'var(--text-secondary)',
													cursor: 'pointer',
													transition: 'all 0.15s',
													opacity:
														s.status !== 'completed'
															? 0.5
															: 1,
												}}
												disabled={
													s.status !== 'completed'
												}
											>
												{s.name}
											</button>
										))}
									</div>
								)}

							{/* Feed */}
							{activeTab === 'feed' && (
								<SocialFeed
									sessionId={id}
									scenarioId={
										selectedPill !== 'main'
											? selectedPill
											: null
									}
								/>
							)}

							{/* Scenarios panel */}
							{activeTab === 'scenarios' && (
								<div
									style={{
										display: 'flex',
										flexDirection: 'column',
										gap: '0.75rem',
										flex: 1,
										overflowY: 'auto',
										paddingRight: '0.2rem',
									}}
								>
									<div
										style={{
											display: 'flex',
											alignItems: 'center',
											justifyContent: 'space-between',
											flexShrink: 0,
										}}
									>
										<div
											style={{
												fontWeight: 700,
												fontSize: '0.9rem',
												display: 'flex',
												alignItems: 'center',
												gap: '0.4rem',
											}}
										>
											<FlaskConical
												size={16}
												color="var(--accent-color)"
											/>
											Simulate a Scenario
										</div>
										<button
											className="btn"
											onClick={() =>
												setShowCreateScenario(true)
											}
											style={{
												display: 'flex',
												alignItems: 'center',
												gap: '0.35rem',
												fontSize: '0.78rem',
												padding: '0.45rem 0.85rem',
											}}
										>
											<Plus size={13} />
											New Scenario
										</button>
									</div>
									<p
										style={{
											margin: 0,
											fontSize: '0.8rem',
											color: 'var(--text-secondary)',
											lineHeight: 1.6,
										}}
									>
										Create "what-if" scenarios that extend
										the current simulation from its
										completed state. Each scenario lets
										agents react to a new hypothetical
										situation.
									</p>
									{scenarios.length === 0 && (
										<div
											style={{
												textAlign: 'center',
												color: 'var(--text-secondary)',
												padding: '2.5rem 1rem',
											}}
										>
											<FlaskConical
												size={28}
												style={{
													marginBottom: '0.5rem',
													opacity: 0.35,
												}}
											/>
											<div
												style={{
													fontWeight: 600,
													fontSize: '0.85rem',
												}}
											>
												No scenarios yet
											</div>
											<div
												style={{
													fontSize: '0.75rem',
													marginTop: '0.25rem',
												}}
											>
												Click "New Scenario" to create
												your first what-if scenario.
											</div>
										</div>
									)}
									{scenarios.map((s) => (
										<ScenarioCard
											key={s.scenario_id}
											scenario={s}
											onRun={handleRunScenario}
											onGenerateReport={(sc) =>
												setScenarioReportTarget(sc)
											}
											liveLog={
												scenarioLiveLogs[
													s.scenario_id
												] || []
											}
										/>
									))}
								</div>
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

							{/* Seed Data */}
							{activeTab === 'seed_data' && (
								<SeedDataPanel sessionId={id} />
							)}

							{/* Reports */}
							{activeTab === 'reports' && (
								<SessionReportsList
									sessionId={id}
									onCountChange={setReportsCount}
									scenarios={scenarios}
								/>
							)}

							{activeTab === 'insights' && (
								<div
									style={{
										flex: 1,
										minHeight: 0,
										overflowY: 'auto',
										paddingRight: '0.2rem',
									}}
								>
									<InsightsDashboard
										sessionId={
											selectedPill !== 'main'
												? selectedPill
												: id
										}
										isScenario={selectedPill !== 'main'}
									/>
								</div>
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
											Ask anything about this simulation —
											covers all scenarios.
										</p>
										<p
											style={{
												fontSize: '0.78rem',
												marginTop: '0.4rem',
												opacity: 0.65,
											}}
										>
											Type <code>#</code> to tag a
											scenario or agent.
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
									position: 'relative',
								}}
							>
								{/* Hashtag autocomplete dropdown */}
								{acSuggestions.length > 0 && (
									<div
										style={{
											position: 'absolute',
											bottom: '100%',
											left: '0.85rem',
											right: '0.85rem',
											background:
												'var(--surface-container)',
											border: '1px solid var(--outline-variant)',
											borderRadius: '8px',
											boxShadow:
												'0 -4px 16px rgba(0,0,0,0.12)',
											overflowY: 'auto',
											maxHeight: '220px',
											zIndex: 99,
										}}
									>
										<div
											style={{
												padding: '0.35rem 0.75rem',
												fontSize: '0.68rem',
												fontWeight: 700,
												color: 'var(--text-secondary)',
												letterSpacing: '0.04em',
												borderBottom:
													'1px solid var(--outline-variant)',
											}}
										>
											TAG AUTOCOMPLETE
										</div>
										{acSuggestions.map((t) => (
											<button
												key={t.tag}
												type="button"
												onMouseDown={(e) => {
													e.preventDefault();
													handleAcSelect(t);
												}}
												style={{
													display: 'flex',
													alignItems: 'center',
													gap: '0.6rem',
													width: '100%',
													padding: '0.45rem 0.75rem',
													background: 'none',
													border: 'none',
													cursor: 'pointer',
													textAlign: 'left',
													color: 'var(--text-primary)',
													fontSize: '0.82rem',
												}}
												onMouseEnter={(e) =>
													(e.currentTarget.style.background =
														'var(--surface-container-high)')
												}
												onMouseLeave={(e) =>
													(e.currentTarget.style.background =
														'none')
												}
											>
												<span
													style={{
														fontSize: '0.65rem',
														fontWeight: 700,
														padding:
															'0.1rem 0.4rem',
														borderRadius: '4px',
														background:
															t.type ===
															'scenario'
																? 'rgba(124,58,237,0.15)'
																: 'rgba(16,185,129,0.15)',
														color:
															t.type ===
															'scenario'
																? '#7c3aed'
																: '#059669',
														flexShrink: 0,
													}}
												>
													{t.type === 'scenario'
														? 'SCN'
														: 'AGT'}
												</span>
												<span
													style={{ fontWeight: 600 }}
												>
													#{t.tag}
												</span>
												<span
													style={{
														color: 'var(--text-secondary)',
														fontSize: '0.78rem',
													}}
												>
													{t.label}
												</span>
											</button>
										))}
									</div>
								)}
								<input
									ref={queryInputRef}
									className="input-field"
									value={query}
									onChange={handleQueryChange}
									onBlur={() =>
										setTimeout(
											() => setAcSuggestions([]),
											150,
										)
									}
									placeholder="Ask anything — covers all scenarios. Type # to tag…"
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
