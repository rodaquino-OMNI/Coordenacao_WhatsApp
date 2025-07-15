declare global {
    var testHelpers: {
        createMockRequest: (overrides?: any) => any;
        createMockResponse: () => any;
        createMockNext: () => jest.Mock;
        delay: (ms: number) => Promise<void>;
    };
}
export {};
//# sourceMappingURL=setup.d.ts.map