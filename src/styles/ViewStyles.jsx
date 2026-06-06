function getStyles() {
    // Standard Obsidian CSS Variables for maximum flexibility
    const theme = {
        background: 'var(--background-primary)',
        backgroundAlt: 'var(--background-secondary)',
        backgroundAlt2: 'var(--background-secondary-alt)',
        foreground: 'var(--text-normal)',
        foregroundMuted: 'var(--text-muted)',
        accent: 'var(--interactive-accent)',
        accentDim: 'rgba(var(--interactive-accent-rgb), 0.1)',
        accentBorder: 'var(--border-color)',
        border: 'var(--border-color)',
        red: 'var(--text-error)',
        green: 'var(--text-success)',
        blue: 'var(--text-accent)'
    };

    const styles = {
        theme,
        wrapper: {
            background: theme.background,
            color: theme.foreground,
            height: '100%',
            width: '100%',
            padding: '24px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxSizing: 'border-box'
        },
        title: {
            fontSize: '22px',
            fontWeight: '800',
            color: theme.foreground,
            margin: '0 0 4px 0',
            letterSpacing: '-0.5px'
        },
        subtitle: {
            fontSize: '12px',
            color: theme.foregroundMuted
        },
        headerData: {
            marginBottom: '20px',
            flexShrink: 0
        },
        badge: (status) => {
            let color = '#a8a8a8';
            let bg = 'rgba(168,168,168,0.1)';
            let border = 'rgba(168,168,168,0.2)';

            if (status === "SECURE MODE" || status === "READY" || status === "✓ SECURE") {
                color = '#4ade80';
                bg = 'rgba(74,222,128,0.1)';
                border = 'rgba(74,222,128,0.2)';
            } else if (status === "LOCKED" || status === "API ERROR" || status === "SAVE FAILED" || status === "MIGRATION FAILED") {
                color = '#f87171';
                bg = 'rgba(248,113,113,0.1)';
                border = 'rgba(248,113,113,0.2)';
            }

            return {
                padding: '4px 10px',
                borderRadius: '12px',
                fontSize: '10px',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                color,
                background: bg,
                border: `1px solid ${border}`,
                display: 'inline-block'
            };
        },
        alert: {
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            padding: '12px 16px',
            borderRadius: '6px',
            border: `1px solid ${theme.border}`,
            background: theme.backgroundAlt,
            fontSize: '12px',
            color: theme.foreground,
            marginBottom: '20px',
            flexShrink: 0
        },
        mainGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '20px',
            flex: 1,
            minHeight: 0,
            overflow: 'hidden'
        },
        glassCard: {
            background: theme.backgroundAlt,
            border: `1px solid ${theme.border}`,
            borderRadius: '8px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            minHeight: 0,
            boxSizing: 'border-box'
        },
        cardHeader: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: `1px solid ${theme.border}`,
            paddingBottom: '8px',
            flexShrink: 0
        },
        cardLabel: {
            fontSize: '12px',
            fontWeight: '700',
            color: theme.accent,
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
        },
        scroll: {
            flex: 1,
            overflowY: 'auto',
            paddingRight: '6px'
        },
        listItem: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 12px',
            borderBottom: `1px solid ${theme.border}`,
            borderRadius: '4px',
            transition: 'background 0.2s',
            boxSizing: 'border-box',
            marginBottom: '4px'
        },
        inputGroup: {
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
        },
        inputLabel: {
            fontSize: '11px',
            fontWeight: '600',
            color: theme.foregroundMuted,
            marginBottom: '4px',
            display: 'block'
        },
        input: {
            width: '100%',
            background: theme.backgroundAlt2,
            border: `1px solid ${theme.border}`,
            padding: '10px 12px',
            color: theme.foreground,
            borderRadius: '4px',
            fontSize: '13px',
            boxSizing: 'border-box',
            outline: 'none',
            transition: 'border-color 0.2s'
        },
        buttonPrimary: (disabled) => ({
            backgroundColor: disabled ? 'var(--interactive-normal)' : 'var(--interactive-accent)',
            color: disabled ? 'var(--text-muted)' : 'var(--text-on-accent)',
            border: 'none',
            padding: '10px 16px',
            fontWeight: '600',
            borderRadius: '4px',
            cursor: disabled ? 'not-allowed' : 'pointer',
            fontSize: '13px',
            width: '100%',
            transition: 'opacity 0.2s'
        }),
        buttonSecondary: {
            background: 'var(--interactive-normal)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-normal)',
            padding: '6px 12px',
            fontWeight: '500',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            transition: 'background 0.2s'
        },
        iconButton: {
            background: 'none',
            border: 'none',
            color: theme.foregroundMuted,
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0.7,
            transition: 'opacity 0.2s'
        },
        resultPanel: {
            padding: '12px',
            background: theme.backgroundAlt2,
            borderRadius: '4px',
            border: `1px solid ${theme.border}`,
            maxHeight: '120px',
            overflowY: 'auto'
        },
        resultCode: {
            fontFamily: 'monospace',
            fontSize: '12px',
            color: theme.green,
            wordBreak: 'break-all',
            userSelect: 'all'
        },
        tabBtn: (act) => ({
            flex: 1,
            padding: '8px',
            fontSize: '11px',
            fontWeight: '600',
            border: 'none',
            background: act ? 'var(--interactive-accent)' : 'var(--interactive-normal)',
            color: act ? 'var(--text-on-accent)' : 'var(--text-normal)',
            borderRadius: '4px',
            cursor: 'pointer',
            opacity: act ? 1 : 0.6,
            transition: 'all 0.2s'
        }),
        leakBox: {
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            padding: '12px 16px',
            borderRadius: '6px',
            marginBottom: '15px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0
        },
        globalCss: `
            .screen-mode-placeholder {
                display: none !important;
            }
            .keychain-bridge-log-item {
                font-size: 11px;
                padding-bottom: 6px;
                margin-bottom: 6px;
                border-bottom: 1px dashed var(--border-color);
            }
        `
    };

    return styles;
}

return { getStyles };
