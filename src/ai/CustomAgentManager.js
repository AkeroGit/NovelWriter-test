/**
 * CustomAgentManager - local-only custom agent definitions.
 *
 * These are deliberately stored outside project state so a user's personal
 * agents do not become part of commits or exported project data.
 */

const STORAGE_KEYS = {
    chat: 'novelwriter_custom_chat_agents',
    novel: 'novelwriter_custom_novel_agents'
};

const PLACEHOLDERS = {
    chat: 'Describe the behaviour and purpose of the AI agent you want to talk to.',
    novel: 'Describe what aspect of your text you want to be reviewed and given suggestions on.'
};

const REFERENCE_PROMPTS = {
    chat: [
        {
            title: 'Quick',
            text: 'Respond like a concise writing assistant. Be direct, practical, and brief. Give the most useful answer first, avoid long explanations unless asked, and focus on the specific writing problem in front of you.'
        },
        {
            title: 'Planning',
            text: 'Act as a structured story-planning partner. Break complex writing requests into clear steps, identify assumptions, ask only necessary clarifying questions, and suggest a practical path before drafting or rewriting anything.'
        },
        {
            title: 'Brainstorm',
            text: 'Help generate fresh story options. Offer several distinct ideas, including safe choices and bolder alternatives. Briefly explain why each option could work, and avoid settling too quickly on a single answer.'
        }
    ],
    novel: [
        {
            title: 'Expand',
            text: 'Review the scene for places that feel underdeveloped. Suggest where the writer could add description, emotional texture, interiority, sensory detail, or connective beats while preserving the scene’s existing intent and voice.'
        },
        {
            title: 'Grammar Check',
            text: 'Review the passage for grammar, punctuation, syntax, awkward phrasing, and clarity issues. Keep feedback specific, explain why a change helps, and avoid rewriting the author’s style unless there is a clear error.'
        },
        {
            title: 'General Review',
            text: 'Give a broad editorial review of the scene. Look at pacing, clarity, emotional engagement, character motivation, dialogue effectiveness, prose quality, and anything that may weaken the reader’s experience. Make suggestions actionable.'
        }
    ]
};

export class CustomAgentManager {
    constructor(app) {
        this.app = app;
        this.modal = document.getElementById('custom-agent-modal');
        this.titleEl = document.getElementById('custom-agent-title');
        this.nameInput = document.getElementById('custom-agent-name');
        this.promptInput = document.getElementById('custom-agent-prompt');
        this.referencesEl = document.getElementById('custom-agent-reference');
        this.referenceTitleEl = document.getElementById('custom-agent-reference-title');
        this.referenceTextEl = document.getElementById('custom-agent-reference-text');
        this.referenceNextBtn = document.getElementById('custom-agent-reference-next');
        this.saveBtn = document.getElementById('custom-agent-save');
        this.cancelBtn = document.getElementById('custom-agent-cancel');
        this.closeBtn = document.getElementById('close-custom-agent');

        this.scope = 'chat';
        this.editingId = null;
        this.referenceIndex = 0;
        this.onSave = null;

        this.bindEvents();
    }

    bindEvents() {
        this.closeBtn?.addEventListener('click', () => this.close());
        this.cancelBtn?.addEventListener('click', () => this.close());
        this.modal?.querySelector('.modal-backdrop')?.addEventListener('click', () => this.close());
        this.saveBtn?.addEventListener('click', () => this.saveFromModal());
        this.referenceNextBtn?.addEventListener('click', () => this.nextReference());

        this.promptInput?.addEventListener('focus', () => {
            this.promptInput.dataset.placeholder = this.promptInput.placeholder;
            this.promptInput.placeholder = '';
        });

        this.promptInput?.addEventListener('blur', () => {
            if (!this.promptInput.value.trim()) {
                this.promptInput.placeholder = this.promptInput.dataset.placeholder || PLACEHOLDERS[this.scope];
            }
        });
    }

    getAgents(scope) {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEYS[scope]) || '[]');
        } catch (error) {
            console.warn('Failed to read custom agents:', error);
            return [];
        }
    }

    getAgent(scope, id) {
        return this.getAgents(scope).find(agent => agent.id === id) || null;
    }

    saveAgent(scope, agent) {
        const agents = this.getAgents(scope);
        const now = new Date().toISOString();
        const trimmed = {
            id: agent.id || crypto.randomUUID(),
            name: agent.name.trim(),
            prompt: agent.prompt.trim(),
            createdAt: agent.createdAt || now,
            updatedAt: now
        };

        const index = agents.findIndex(existing => existing.id === trimmed.id);
        if (index >= 0) {
            agents[index] = trimmed;
        } else {
            agents.push(trimmed);
        }

        localStorage.setItem(STORAGE_KEYS[scope], JSON.stringify(agents));
        return trimmed;
    }

    deleteAgent(scope, id) {
        const agents = this.getAgents(scope).filter(agent => agent.id !== id);
        localStorage.setItem(STORAGE_KEYS[scope], JSON.stringify(agents));
    }

    open(scope, agent = null, onSave = null) {
        this.scope = scope;
        this.editingId = agent?.id || null;
        this.onSave = onSave;
        this.referenceIndex = 0;

        if (this.titleEl) {
            this.titleEl.textContent = agent ? 'Edit Custom Agent' : 'Add Custom Agent';
        }
        if (this.nameInput) {
            this.nameInput.value = agent?.name || '';
        }
        if (this.promptInput) {
            this.promptInput.value = agent?.prompt || '';
            this.promptInput.placeholder = PLACEHOLDERS[scope];
            this.promptInput.dataset.placeholder = PLACEHOLDERS[scope];
        }

        this.renderReference();
        this.modal?.classList.add('open');
        this.nameInput?.focus();
    }

    close() {
        this.modal?.classList.remove('open');
        this.editingId = null;
        this.onSave = null;
    }

    saveFromModal() {
        const name = this.nameInput?.value.trim() || '';
        const prompt = this.promptInput?.value.trim() || '';

        if (!name) {
            alert('Please enter an agent name.');
            this.nameInput?.focus();
            return;
        }
        if (!prompt) {
            alert('Please enter an agent prompt.');
            this.promptInput?.focus();
            return;
        }

        const previous = this.editingId ? this.getAgent(this.scope, this.editingId) : null;
        const saved = this.saveAgent(this.scope, {
            ...previous,
            id: this.editingId,
            name,
            prompt
        });

        this.onSave?.(saved);
        this.close();
    }

    nextReference() {
        const refs = REFERENCE_PROMPTS[this.scope] || [];
        if (!refs.length) return;
        this.referenceIndex = (this.referenceIndex + 1) % refs.length;
        this.renderReference();
    }

    renderReference() {
        const refs = REFERENCE_PROMPTS[this.scope] || [];
        const ref = refs[this.referenceIndex];
        if (!ref) return;

        if (this.referenceTitleEl) this.referenceTitleEl.textContent = ref.title;
        if (this.referenceTextEl) this.referenceTextEl.textContent = ref.text;
        if (this.referencesEl) {
            this.referencesEl.dataset.index = `${this.referenceIndex + 1} / ${refs.length}`;
        }
    }
}
