class MessageStore {
    private store: Map<string, string>;

    constructor() {
        this.store = new Map();
    }

    getMessage(userId: string): string | undefined {
        return this.store.get(userId);
    }

    setMessage(userId: string, message: string): void {
        this.store.set(userId, message);
    }
}

const messageStore = new MessageStore();
export default messageStore;