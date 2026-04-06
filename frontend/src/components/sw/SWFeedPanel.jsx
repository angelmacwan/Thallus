import React, { useState, useEffect } from 'react';
import {
	ThumbsUp,
	ThumbsDown,
	MessageSquare,
	ChevronDown,
	ChevronUp,
	Rss,
	RefreshCw,
} from 'lucide-react';
import api from '../../api';

const AVATAR_COLORS = [
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

const avatarColor = (idx) =>
	AVATAR_COLORS[
		(((idx ?? 0) % AVATAR_COLORS.length) + AVATAR_COLORS.length) %
			AVATAR_COLORS.length
	];

function getVal(obj, ...keys) {
	for (const k of keys) {
		if (obj[k] !== undefined && obj[k] !== null) return obj[k];
	}
	return null;
}

function formatDate(val) {
	if (!val) return null;
	try {
		if (typeof val === 'number')
			return new Date(val < 1e10 ? val * 1000 : val).toLocaleString();
		return new Date(val).toLocaleString();
	} catch {
		return String(val);
	}
}

function Avatar({ name, color, size = 36 }) {
	return (
		<div
			style={{
				width: size,
				height: size,
				borderRadius: '50%',
				background: color,
				color: '#fff',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				fontWeight: 700,
				fontSize: size * 0.38 + 'px',
				flexShrink: 0,
			}}
		>
			{name?.charAt(0)?.toUpperCase() || '?'}
		</div>
	);
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
	const agentIdx = agentMap
		? Object.keys(agentMap).findIndex((k) => agentMap[k] === agent)
		: -1;
	const color = avatarColor(agentIdx >= 0 ? agentIdx : (userId ?? 0));

	return (
		<div
			style={{
				display: 'flex',
				gap: '0.55rem',
				padding: '0.6rem 0.9rem 0.6rem 1.1rem',
				borderBottom: '1px solid var(--outline-variant)',
				background: 'var(--surface-container-lowest)',
			}}
		>
			<Avatar
				name={displayName}
				color={color}
				size={28}
			/>
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
							marginTop: '0.15rem',
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
							marginTop: '0.2rem',
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
	const agentIdx = agentMap
		? Object.keys(agentMap).findIndex((k) => agentMap[k] === agent)
		: -1;
	const color = avatarColor(agentIdx >= 0 ? agentIdx : (userId ?? 0));

	const isScenarioPost = content.startsWith('[SCENARIO SEED]');
	const displayContent = isScenarioPost
		? content.replace('[SCENARIO SEED] ', '')
		: content;

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
					◆ Scenario Seed
				</div>
			)}
			<div
				style={{
					display: 'flex',
					gap: '0.65rem',
					padding: '0.85rem',
					alignItems: 'flex-start',
				}}
			>
				<Avatar
					name={displayName}
					color={color}
					size={38}
				/>
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
							{formatDate(createdAt)}
						</div>
					)}
				</div>
			</div>

			{displayContent && (
				<div
					style={{
						padding: '0 0.9rem 0.85rem',
						fontSize: '0.85rem',
						lineHeight: 1.65,
						color: 'var(--text-primary)',
					}}
				>
					{displayContent}
				</div>
			)}

			<div
				style={{
					display: 'flex',
					gap: '1.1rem',
					padding: '0.5rem 0.9rem',
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
						{comments.length === 1 ? 'reply' : 'replies'}
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

export default function SWFeedPanel({ worldId, scenarioId, liveStatus }) {
	const [state, setState] = useState({ loading: true, data: null });
	const isCompleted = liveStatus === 'completed';

	useEffect(() => {
		if (!worldId || !scenarioId) return;
		let cancelled = false;
		api.get(`/small-world/worlds/${worldId}/scenarios/${scenarioId}/feed`)
			.then((r) => {
				if (!cancelled) setState({ loading: false, data: r.data });
			})
			.catch(() => {
				if (!cancelled)
					setState({
						loading: false,
						data: { posts: [], comments: [], agents: [] },
					});
			});
		return () => {
			cancelled = true;
		};
	}, [worldId, scenarioId, isCompleted]);

	const { loading, data } = state;

	if (loading) {
		return (
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					justifyContent: 'center',
					flex: 1,
					gap: '0.5rem',
					color: 'var(--text-secondary)',
					fontSize: '0.85rem',
				}}
			>
				<RefreshCw
					size={20}
					style={{
						animation: 'spin 1.4s linear infinite',
						color: 'var(--accent-color)',
					}}
				/>
				Loading feed…
			</div>
		);
	}

	const { posts = [], comments = [], agents = [] } = data || {};

	const agentMap = {};
	agents.forEach((a, i) => {
		agentMap[i] = a;
		agentMap[String(i)] = a;
	});

	const commentsByPost = {};
	comments.forEach((c) => {
		const pid = getVal(c, 'post_id');
		if (pid === undefined || pid === null) return;
		if (!commentsByPost[pid]) commentsByPost[pid] = [];
		commentsByPost[pid].push(c);
	});

	if (posts.length === 0) {
		return (
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					justifyContent: 'center',
					flex: 1,
					gap: '0.5rem',
					color: 'var(--text-secondary)',
					padding: '2rem',
					textAlign: 'center',
				}}
			>
				<Rss
					size={28}
					style={{ opacity: 0.35 }}
				/>
				<div style={{ fontWeight: 600, fontSize: '0.88rem' }}>
					No feed data yet.
				</div>
				<div style={{ fontSize: '0.76rem' }}>
					{liveStatus === 'running' || liveStatus === 'created'
						? 'Agent posts will appear here once the simulation completes.'
						: 'No agent posts were recorded for this scenario.'}
				</div>
			</div>
		);
	}

	return (
		<div
			style={{
				flex: 1,
				overflowY: 'auto',
				display: 'flex',
				flexDirection: 'column',
				gap: '0.75rem',
				padding: '0.9rem 1.1rem',
			}}
		>
			{posts.map((p, i) => {
				const pid = getVal(p, 'post_id', 'id') ?? i;
				return (
					<PostCard
						key={pid}
						post={p}
						comments={commentsByPost[pid] || []}
						agentMap={agentMap}
					/>
				);
			})}
		</div>
	);
}
