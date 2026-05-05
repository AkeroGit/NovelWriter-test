/**
 * ContextMenu - Reusable context menu component
 */

export class ContextMenu {
    constructor() {
        this.menu = null;
        this.createMenu();
        this.bindGlobalEvents();
    }

    createMenu() {
        this.menu = document.createElement('div');
        this.menu.className = 'context-menu';
        this.menu.innerHTML = '';
        document.body.appendChild(this.menu);
    }

    bindGlobalEvents() {
        document.addEventListener('click', (e) => {
            if (!this.menu.contains(e.target) && !e.target.classList.contains('context-menu-trigger')) {
                this.hide();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hide();
            }
        });
    }

    show(x, y, items) {
        this.menu.innerHTML = items.map((item, idx) => {
            if (item.divider) {
                return '<div class="context-menu-divider"></div>';
            }

            if (item.submenu) {
                return `
                <div class="context-menu-item has-submenu" data-submenu-idx="${idx}">
                    ${item.icon ? `<span class="context-menu-icon">${this.escapeHtml(item.icon)}</span>` : ''}
                    <span class="context-menu-label">${this.escapeHtml(item.label)}</span>
                    <span class="context-menu-arrow">▶</span>
                    <div class="context-submenu">
                        ${item.submenu.map((sub, subIdx) => {
                    if (sub.divider) return '<div class="context-menu-divider"></div>';
                    const actions = sub.actions?.length ? `
                        <span class="context-menu-actions">
                            ${sub.actions.map((action, actionIdx) => `
                                <button class="context-menu-action${action.danger ? ' danger' : ''}" type="button" title="${this.escapeAttribute(action.title || action.label)}" data-parent="${idx}" data-sub="${subIdx}" data-action-idx="${actionIdx}">
                                    ${this.escapeHtml(action.label)}
                                </button>
                            `).join('')}
                        </span>
                    ` : '';
                    return `
                        <button class="context-menu-item${actions ? ' with-actions' : ''}" data-parent="${idx}" data-sub="${subIdx}">
                            <span class="context-menu-label">${this.escapeHtml(sub.label)}</span>
                            ${actions}
                        </button>
                    `;
                }).join('')}
                    </div>
                </div>`;
            }

            return `
                <button class="context-menu-item" data-action="${this.escapeAttribute(item.action || '')}" data-idx="${idx}">
                    ${item.icon ? `<span class="context-menu-icon">${this.escapeHtml(item.icon)}</span>` : ''}
                    <span class="context-menu-label">${this.escapeHtml(item.label)}</span>
                </button>
            `;
        }).join('');

        items.forEach((item, originalIdx) => {
            if (item.divider) return;

            if (item.submenu) {
                const parentItem = this.menu.querySelector(`[data-submenu-idx="${originalIdx}"]`);
                if (parentItem) {
                    parentItem.addEventListener('mouseenter', () => this.positionSubmenu(parentItem));
                    parentItem.addEventListener('focusin', () => this.positionSubmenu(parentItem));
                }
                item.submenu.forEach((subItem, subIdx) => {
                    if (subItem.divider) return;
                    const btn = this.menu.querySelector(`[data-parent="${originalIdx}"][data-sub="${subIdx}"]`);
                    this.bindItemEvents(btn, subItem);
                    subItem.actions?.forEach((action, actionIdx) => {
                        const actionBtn = this.menu.querySelector(`[data-parent="${originalIdx}"][data-sub="${subIdx}"][data-action-idx="${actionIdx}"]`);
                        this.bindActionButton(actionBtn, action);
                    });
                });
            } else {
                const btn = this.menu.querySelector(`[data-idx="${originalIdx}"]`);
                this.bindItemEvents(btn, item);
            }
        });

        this.menu.style.left = `${x}px`;
        this.menu.style.top = `${y}px`;
        this.menu.classList.add('visible');

        const rect = this.menu.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
            this.menu.style.left = `${window.innerWidth - rect.width - 10}px`;
        }
        if (rect.bottom > window.innerHeight) {
            this.menu.style.top = `${window.innerHeight - rect.height - 10}px`;
        }

        this.menu.querySelectorAll('.context-menu-item.has-submenu').forEach(parentItem => {
            this.positionSubmenu(parentItem);
        });
    }

    positionSubmenu(parentItem) {
        const submenu = parentItem.querySelector('.context-submenu');
        if (!submenu) return;

        submenu.style.left = '100%';
        submenu.style.right = 'auto';
        submenu.style.top = '0px';
        submenu.style.maxHeight = '';
        submenu.style.overflowY = '';

        const margin = 10;
        const parentRect = parentItem.getBoundingClientRect();
        const submenuWidth = submenu.offsetWidth || 180;
        const submenuHeight = submenu.scrollHeight || submenu.offsetHeight;

        if (parentRect.right + submenuWidth > window.innerWidth - margin) {
            submenu.style.left = 'auto';
            submenu.style.right = '100%';
        }

        const availableHeight = window.innerHeight - (margin * 2);
        if (submenuHeight > availableHeight) {
            submenu.style.maxHeight = `${availableHeight}px`;
            submenu.style.overflowY = 'auto';
            submenu.style.top = `${margin - parentRect.top}px`;
            return;
        }

        const desiredTop = Math.max(
            margin,
            Math.min(parentRect.top, window.innerHeight - submenuHeight - margin)
        );
        submenu.style.top = `${desiredTop - parentRect.top}px`;
    }

    bindItemEvents(btn, item) {
        if (!btn) return;

        if (item.onClick) {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                item.onClick();
                this.hide();
            });
        }

        if (item.onContextMenu) {
            btn.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.hide();
                item.onContextMenu(e.clientX, e.clientY);
            });
        }
    }

    bindActionButton(btn, action) {
        if (!btn || !action.onClick) return;

        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            action.onClick();
            this.hide();
        });
    }

    hide() {
        this.menu.classList.remove('visible');
    }

    escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    escapeAttribute(value) {
        return this.escapeHtml(value);
    }
}

let contextMenuInstance = null;

export function getContextMenu() {
    if (!contextMenuInstance) {
        contextMenuInstance = new ContextMenu();
    }
    return contextMenuInstance;
}
