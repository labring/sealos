import { getPrivateWorkspaceDisplayName } from '@/utils/workspace';

describe('workspace display helpers', () => {
  it('localizes legacy private workspace placeholder names', () => {
    expect(
      getPrivateWorkspaceDisplayName({
        teamName: 'private team',
        defaultName: '个人空间'
      })
    ).toBe('个人空间');
    expect(
      getPrivateWorkspaceDisplayName({
        teamName: 'My Workspace',
        defaultName: 'Personal Workspace'
      })
    ).toBe('Personal Workspace');
    expect(
      getPrivateWorkspaceDisplayName({
        teamName: 'Personal Workspace',
        defaultName: '个人空间'
      })
    ).toBe('个人空间');
    expect(
      getPrivateWorkspaceDisplayName({
        teamName: '个人空间',
        defaultName: 'Personal Workspace'
      })
    ).toBe('Personal Workspace');
  });

  it('keeps custom private workspace names', () => {
    expect(
      getPrivateWorkspaceDisplayName({
        teamName: '研发环境',
        defaultName: '个人空间'
      })
    ).toBe('研发环境');
  });
});
