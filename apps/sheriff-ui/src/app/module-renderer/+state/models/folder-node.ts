export type FolderNode = {
  id: string;
  parentId?: string;
  name: string;
  tags?: string[];
  hasChildren?: boolean;
  isSheriffModule?: boolean;
  children: FolderNode[];
};
