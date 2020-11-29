module.exports = {
  title: '@jsmrcaga/mongo',
  tagline: 'A simple, 1-dependency, MongoDB ORM',
  url: 'https://your-docusaurus-test-site.com',
  baseUrl: '/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/favicon.ico',
  organizationName: 'Jo Colina', // Usually your GitHub org/user name.
  projectName: '@jsmrcaga/mongo', // Usually your repo name.
  themeConfig: {
    navbar: {
      title: '@jsmrcaga/mongo',
      logo: {
        alt: '@jsmrcaga/mongo',
        src: 'img/logo.svg',
      },
      items: [
        {
          to: 'docs/',
          activeBasePath: 'docs',
          label: 'Docs',
          position: 'left',
        },
        {
          href: 'https://github.com/facebook/docusaurus',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Style Guide',
              to: 'docs/',
            },
            {
              label: 'Second Doc',
              to: 'docs/doc2/',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/jsmrcaga/mmtb',
            },
            {
              label: 'Twitter',
              href: 'https://twitter.com/jsmrcaga',
            },
          ],
        },

      ],
      copyright: `Copyright © ${new Date().getFullYear()} @jsmrcaga, Inc. Built with Docusaurus.`,
    },
  },
  presets: [
    [
      '@docusaurus/preset-classic',
      {
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          // Please change this to your repo.
          editUrl:
            'https://github.com/jsmrcaga/mmbt/edit/master/docs/',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      },
    ],
  ],
};
