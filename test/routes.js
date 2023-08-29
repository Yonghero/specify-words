export const routes = [
  {
    path: '/a',
    name: 'A',
    component: import('./components/Test.vue'),
    meta: {
      role: 'a_1',
      name: 'A',
    },
    children: [
      {
        path: '/a/1',
        // component: 'xxx',
        name: 'A_1',
        meta: {
          role: 'a_1_1',
          name: 'A_1',
        },
      },
      {
        path: '/a/2',
        name: 'A_2',
        // component: 'xxx',
        meta: {
          role: 'a_1_2',
          name: 'A_2',
        },
      },
      {
        path: '/a/3',
        name: 'A_3',
        // component: 'xxx',
        meta: {
          role: 'a_1_3',
          name: 'A_3',
        },
      },
    ],
  },
  {
    path: '/b',
    name: 'B',
    // component: 'xxx',
    meta: {
      role: 'b_1',
      name: 'B',
    },
    children: [
      {
        path: '/b/1',
        name: 'B_1',
        // component: 'xxx',
        meta: {
          role: 'b_1_1',
          name: 'B_1',
        },
      },
      {
        path: '/b/2',
        name: 'B_2',
        // component: 'xxx',
        meta: {
          role: 'b_1_2',
          name: 'B_2',
        },
      },
      {
        path: '/b/3',
        name: 'B_3',
        // component: 'xxx',
        meta: {
          role: 'b_1_3',
          name: 'B_3',
        },
      },
    ],
  },
]
