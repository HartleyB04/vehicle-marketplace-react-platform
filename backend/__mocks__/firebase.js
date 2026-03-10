const wishlist = {};
const swapRequests = {};

const createDoc = (collection, id) => ({
    id,
    exists: !!collection[id],
    data: () => collection[id] || {},
    ref: {
        delete: () => {
            delete collection[id];
            return Promise.resolve();
        },
    },
});

const collectionMock = (colName) => {
    let colData;
    switch(colName) {
        case "wishlist": colData = wishlist; break;
        case "swapRequests": colData = swapRequests; break;
        default: colData = {};
    }

    return {
        doc: (id) => ({
            get: jest.fn(() => Promise.resolve(createDoc(colData, id))),
            set: jest.fn((data) => { colData[id] = data; return Promise.resolve(createDoc(colData, id)); }),
            update: jest.fn((data) => { colData[id] = { ...colData[id], ...data }; return Promise.resolve(); }),
            delete: jest.fn(() => { delete colData[id]; return Promise.resolve(); }),
        }),
        add: jest.fn((data) => {
            const id = `id-${Math.random().toString(36).substring(2, 8)}`;
            colData[id] = data;
            return Promise.resolve(createDoc(colData, id));
        }),
        where: (field, op, value) => ({
            orderBy: () => ({
                get: jest.fn(() => Promise.resolve({
                    docs: Object.entries(colData)
                        .filter(([_, doc]) => doc[field] === value)
                        .map(([id, doc]) => createDoc(colData, id))
                }))
            }),
            get: jest.fn(() => Promise.resolve({
                docs: Object.entries(colData)
                    .filter(([_, doc]) => doc[field] === value)
                    .map(([id, doc]) => createDoc(colData, id))
            })),
        }),
        orderBy: () => ({
            get: jest.fn(() => Promise.resolve({
                docs: Object.entries(colData).map(([id, doc]) => createDoc(colData, id))
            }))
        }),
        batch: () => {
            const ops = [];
            return {
                delete: (docRef) => ops.push(() => docRef.ref.delete()),
                commit: () => Promise.all(ops.map(f => f())),
            };
        },
    };
};

const firestoreMock = () => ({ collection: collectionMock });

module.exports = {
    admin: { auth: jest.fn(), firestore: firestoreMock },
    db: firestoreMock(),
};
