'use client';

import {
    useRef,
    useState,
    useCallback,
    ReactNode,
    CSSProperties,
    TouchEvent,
    MouseEvent,
} from 'react';

interface SwipeAction {
    /** Unique key for the action */
    key: string;
    /** Action label */
    label: string;
    /** Icon to display */
    icon?: ReactNode;
    /** Background color (CSS variable or hex) */
    color: string;
    /** Text/icon color */
    textColor?: string;
    /** Callback when action is triggered */
    onAction: () => void;
}

interface SwipeActionsProps {
    /** Main content */
    children: ReactNode;
    /** Actions revealed on right swipe */
    rightActions?: SwipeAction[];
    /** Actions revealed on left swipe */
    leftActions?: SwipeAction[];
    /** Swipe threshold to reveal actions (px) */
    threshold?: number;
    /** Full swipe to trigger first action */
    fullSwipeEnabled?: boolean;
    /** Container class */
    className?: string;
    /** Disable swipe (for touch devices only) */
    disabled?: boolean;
    /** Callback when swipe starts */
    onSwipeStart?: () => void;
    /** Callback when swipe ends */
    onSwipeEnd?: () => void;
}

/**
 * Gesture-driven swipe reveal for action buttons.
 * Works on both touch and mouse (drag).
 */
export function SwipeActions({
    children,
    rightActions = [],
    leftActions = [],
    threshold = 80,
    fullSwipeEnabled = true,
    className = '',
    disabled = false,
    onSwipeStart,
    onSwipeEnd,
}: SwipeActionsProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [translateX, setTranslateX] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [startTranslateX, setStartTranslateX] = useState(0);

    const rightActionsWidth = rightActions.length * threshold;
    const leftActionsWidth = leftActions.length * threshold;

    const handleDragStart = useCallback(
        (clientX: number) => {
            if (disabled) return;
            setIsDragging(true);
            setStartX(clientX);
            setStartTranslateX(translateX);
            onSwipeStart?.();
        },
        [disabled, translateX, onSwipeStart]
    );

    const handleDragMove = useCallback(
        (clientX: number) => {
            if (!isDragging) return;

            const deltaX = clientX - startX;
            let newTranslateX = startTranslateX + deltaX;

            // Apply resistance at boundaries
            const maxRight = rightActionsWidth;
            const maxLeft = leftActionsWidth;

            if (newTranslateX < -maxRight) {
                const overflow = -newTranslateX - maxRight;
                newTranslateX = -maxRight - overflow * 0.2; // Resistance
            }
            if (newTranslateX > maxLeft) {
                const overflow = newTranslateX - maxLeft;
                newTranslateX = maxLeft + overflow * 0.2; // Resistance
            }

            setTranslateX(newTranslateX);
        },
        [isDragging, startX, startTranslateX, rightActionsWidth, leftActionsWidth]
    );

    const handleDragEnd = useCallback(() => {
        if (!isDragging) return;
        setIsDragging(false);
        onSwipeEnd?.();

        // Snap to positions
        const absTranslate = Math.abs(translateX);

        // Full swipe triggers first action
        if (fullSwipeEnabled) {
            if (translateX < -rightActionsWidth * 1.5 && rightActions.length > 0) {
                rightActions[0].onAction();
                setTranslateX(0);
                return;
            }
            if (translateX > leftActionsWidth * 1.5 && leftActions.length > 0) {
                leftActions[0].onAction();
                setTranslateX(0);
                return;
            }
        }

        // Snap to nearest state
        if (translateX < -threshold / 2 && rightActions.length > 0) {
            setTranslateX(-rightActionsWidth);
        } else if (translateX > threshold / 2 && leftActions.length > 0) {
            setTranslateX(leftActionsWidth);
        } else {
            setTranslateX(0);
        }
    }, [
        isDragging,
        translateX,
        threshold,
        rightActionsWidth,
        rightActions,
        fullSwipeEnabled,
        leftActionsWidth,
        leftActions,
        onSwipeEnd,
    ]);

    // Touch handlers
    const handleTouchStart = (e: TouchEvent) => {
        handleDragStart(e.touches[0].clientX);
    };

    const handleTouchMove = (e: TouchEvent) => {
        handleDragMove(e.touches[0].clientX);
    };

    const handleTouchEnd = () => {
        handleDragEnd();
    };

    // Mouse handlers (for desktop)
    const handleMouseDown = (e: MouseEvent) => {
        handleDragStart(e.clientX);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const handleMouseMove = (e: globalThis.MouseEvent) => {
        handleDragMove(e.clientX);
    };

    const handleMouseUp = () => {
        handleDragEnd();
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    };

    const close = useCallback(() => {
        setTranslateX(0);
    }, []);

    const contentStyle: CSSProperties = {
        transform: `translateX(${translateX}px)`,
        transition: isDragging ? 'none' : 'transform 300ms ease-out',
        backgroundColor: 'inherit',
        position: 'relative',
        zIndex: 10,
        height: '100%',
        width: '100%'
    };

    const renderActions = (actions: SwipeAction[], side: 'left' | 'right') => {
        const isRight = side === 'right';
        const containerStyle: CSSProperties = {
            position: 'absolute',
            top: 0,
            bottom: 0,
            [side]: 0,
            display: 'flex',
            flexDirection: isRight ? 'row-reverse' : 'row',
            zIndex: 1,
        };

        return (
            <div className={`swipe-actions-${side}`} style={containerStyle}>
                {actions.map((action, index) => {
                    const progress = isRight
                        ? Math.min(1, Math.abs(translateX) / (threshold * (index + 1)))
                        : Math.min(1, translateX / (threshold * (index + 1)));

                    const actionStyle: CSSProperties = {
                        width: `${threshold}px`,
                        backgroundColor: action.color,
                        color: action.textColor ?? '#fff',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        opacity: progress,
                        transform: `scale(${0.8 + progress * 0.2})`,
                        transition: isDragging ? 'none' : 'all 200ms ease-out',
                        border: 'none',
                        cursor: 'pointer'
                    };

                    return (
                        <button
                            key={action.key}
                            className="swipe-action-button duration-200 active:scale-90"
                            style={actionStyle}
                            onClick={() => {
                                action.onAction();
                                close();
                            }}
                            aria-label={action.label}
                        >
                            {action.icon}
                            <span className="text-xs font-medium tracking-tight mt-1">{action.label}</span>
                        </button>
                    );
                })}
            </div>
        );
    };

    return (
        <div
            ref={containerRef}
            className={`relative overflow-hidden ${className}`.trim()}
            style={{ touchAction: 'pan-y' }}
        >
            {/* Background actions */}
            {rightActions.length > 0 && renderActions(rightActions, 'right')}
            {leftActions.length > 0 && renderActions(leftActions, 'left')}

            {/* Main content */}
            <div
                style={contentStyle}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onMouseDown={handleMouseDown}
            >
                {children}
            </div>
        </div>
    );
}
