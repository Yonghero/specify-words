export const routes = [
  {
    path: '/a',
    name: '11',
    component: () => import('./components/Test.vue'),
    meta: {
      role: 'a_1',
      name: '来吧',
    },
    children: [
      {
        path: '/a/1',
        component: () => import('./components/Layout.vue'),
        name: 'hhh',
        meta: {
          role: 'a_1_1',
          name: 'A_1',
        },
      },
      {
        path: '/a/2',
        name: 'hhh2',
        meta: {
          role: 'a_1_2',
          name: 'A_2',
        },
      },
      {
        path: '/a/3',
        name: 'hhh3',
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
    meta: {
      role: 'b_1',
      name: 'jkjk',
    },
    children: [
      {
        path: '/b/1',
        name: 'hhh2',
        meta: {
          role: 'b_1_1',
          name: 'B_1',
        },
      },
      {
        path: '/b/2',
        name: 'lkl',
        meta: {
          role: 'b_1_2',
          name: 'B_2',
        },
      },
      {
        path: '/b/3',
        name: 'ioio',
        meta: {
          role: 'b_1_3',
          name: 'B_3',
        },
      },
    ],
  },
]
