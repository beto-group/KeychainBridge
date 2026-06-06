function ControlsMenu({ onReload, onToggle, styles, isFullTab }) {
    const theme = styles.theme;
    
    const s = {
        group: {
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--background-secondary)',
            border: `1px solid var(--border-color)`,
            padding: '4px 8px',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        },
        button: {
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '4px',
            transition: 'all 0.2s'
        }
    };

    return h('div', { style: s.group },
        h('button', { 
            style: s.button, 
            onClick: onReload,
            title: "Reload Code",
            onMouseOver: (e) => { e.currentTarget.style.color = theme.accent; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; },
            onMouseOut: (e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'none'; }
        },
            h(dc.Icon, { icon: 'rotate-cw', style: { width: '14px', height: '14px' } })
        ),
        h('button', { 
            style: s.button, 
            onClick: onToggle,
            title: isFullTab ? "Collapse to Compact" : "Expand to Full Tab",
            onMouseOver: (e) => { e.currentTarget.style.color = theme.accent; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; },
            onMouseOut: (e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'none'; }
        },
            h(dc.Icon, { icon: isFullTab ? 'minimize-2' : 'maximize-2', style: { width: '14px', height: '14px' } })
        )
    );
}

return { ControlsMenu };
