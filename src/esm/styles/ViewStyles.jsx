const dc = window.dc || window.datacore;

function getStyles() {
    // Standard Obsidian CSS Variables for maximum flexibility
    const theme = {
        background: 'var(--background-primary)',
        backgroundAlt: 'var(--background-secondary)',
        backgroundAlt2: 'var(--background-secondary-alt)',
        foreground: 'var(--text-normal)',
        foregroundMuted: 'var(--text-muted)',
        accent: 'var(--text-normal)',
        accentDim: 'rgba(255, 255, 255, 0.05)',
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
            let color = 'var(--text-muted)';
            let bg = 'var(--background-secondary-alt)';
            let border = 'var(--border-color)';

            if (status === "SECURE MODE" || status === "READY" || status === "✓ SECURE") {
                color = 'var(--text-success)';
                bg = 'rgba(var(--mono-rgb-100), 0.05)';
                border = 'var(--text-success)';
            } else if (status === "LOCKED" || status === "API ERROR" || status === "SAVE FAILED" || status === "MIGRATION FAILED") {
                color = 'var(--text-error)';
                bg = 'rgba(var(--mono-rgb-100), 0.05)';
                border = 'var(--text-error)';
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
                opacity: 0.8,
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
            fontSize: '11px',
            fontWeight: '700',
            color: theme.foregroundMuted,
            textTransform: 'uppercase',
            letterSpacing: '0.8px'
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
            backgroundColor: disabled ? 'var(--background-secondary)' : 'var(--background-secondary-alt)',
            color: disabled ? 'var(--text-muted)' : 'var(--text-normal)',
            border: `1px solid var(--border-color)`,
            padding: '10px 16px',
            fontWeight: '500',
            borderRadius: '6px',
            cursor: disabled ? 'not-allowed' : 'pointer',
            fontSize: '13px',
            width: '100%',
            transition: 'all 0.2s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }),
        buttonSecondary: {
            background: 'var(--background-secondary-alt)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-normal)',
            padding: '10px 16px',
            fontWeight: '500',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px',
            width: '100%',
            boxSizing: 'border-box',
            transition: 'all 0.2s'
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
            border: `1px solid ${act ? 'var(--border-color)' : 'transparent'}`,
            background: act ? 'var(--background-primary)' : 'transparent',
            color: act ? 'var(--text-normal)' : 'var(--text-muted)',
            borderRadius: '4px',
            cursor: 'pointer',
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
            .tooltip-container {
                position: relative;
                display: inline-flex;
                align-items: center;
                cursor: pointer;
            }
            .tooltip-text {
                visibility: hidden;
                width: 220px;
                background-color: var(--background-secondary-alt);
                color: var(--text-normal);
                text-align: left;
                border: 1px solid var(--border-color);
                border-radius: 6px;
                padding: 8px 12px;
                position: absolute;
                z-index: 9999;
                bottom: 125%;
                left: 50%;
                transform: translateX(-50%);
                opacity: 0;
                transition: opacity 0.25s, visibility 0.25s;
                font-size: 11px;
                font-weight: normal;
                line-height: 1.4;
                box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                pointer-events: none;
                white-space: normal;
            }
            .tooltip-container:hover .tooltip-text {
                visibility: visible;
                opacity: 1;
            }
            
            /* Custom minimalist action button styling */
            .keychain-bridge-action-btn {
                color: var(--text-muted) !important;
                opacity: 0.6;
                transition: color 0.2s, opacity 0.2s;
                background: none;
                border: none;
                cursor: pointer;
                padding: 4px;
                display: flex;
                alignItems: center;
                justifyContent: center;
            }
            .keychain-bridge-action-btn:hover {
                color: var(--text-normal) !important;
                opacity: 1 !important;
            }

            .keychain-bridge-delete-btn {
                color: var(--text-muted) !important;
                opacity: 0.6;
                transition: color 0.2s, opacity 0.2s;
                background: none;
                border: none;
                cursor: pointer;
                padding: 4px;
                display: flex;
                alignItems: center;
                justifyContent: center;
            }
            .keychain-bridge-delete-btn:hover {
                color: var(--text-error) !important;
                opacity: 1 !important;
            }
        `
    };

    return styles;
}

export { getStyles };