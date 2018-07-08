module.exports = {
    env: {
        es6: true,
        node: true
    },
    extends: "eslint:recommended",
    parserOptions: {
        sourceType: "module",
        ecmaVersion: 2017,
    },
    globals: {
        BOT: false,
        getLogger: false,
    },
    rules: {
        // "handle-callback-error": "warn",
        "indent": [ "warn", "tab" ],
        "quotes": [ "warn", "single", {
            "avoidEscape": true,
            "allowTemplateLiterals": true,
        }],
        "semi": [ "warn", "always" ],
        "no-unused-vars": "warn",
        "no-console": "warn",
        "no-empty": "warn",
    }
};