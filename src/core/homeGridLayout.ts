export type HomeGridInput = {
  isFolder: boolean;
  token: string;
};

export type HomeGridPlacement = HomeGridInput & {
  column: number;
  columnSpan: 1 | 2;
  row: number;
  rowSpan: 1 | 2;
};

function findOpenPosition(occupied: boolean[][], columnSpan: number, rowSpan: number) {
  const rows = occupied.length;
  const columns = occupied[0]?.length ?? 0;
  for (let row = 0; row <= rows - rowSpan; row += 1) {
    for (let column = 0; column <= columns - columnSpan; column += 1) {
      let available = true;
      for (let offsetRow = 0; offsetRow < rowSpan && available; offsetRow += 1) {
        for (let offsetColumn = 0; offsetColumn < columnSpan; offsetColumn += 1) {
          if (occupied[row + offsetRow]?.[column + offsetColumn]) {
            available = false;
            break;
          }
        }
      }
      if (available) return { column, row };
    }
  }
  return null;
}

function occupyCells(occupied: boolean[][], placement: HomeGridPlacement) {
  for (let row = placement.row - 1; row < placement.row - 1 + placement.rowSpan; row += 1) {
    for (let column = placement.column - 1; column < placement.column - 1 + placement.columnSpan; column += 1) {
      occupied[row]![column] = true;
    }
  }
}

export function packHomeGridPages(items: HomeGridInput[], columns: number, rows: number): HomeGridPlacement[][] {
  const safeColumns = Math.trunc(columns);
  const safeRows = Math.trunc(rows);
  if (safeColumns < 2 || safeRows < 2) throw new RangeError('首页网格至少需要两列两行才能容纳文件夹');

  const pages: HomeGridPlacement[][] = [];
  let page: HomeGridPlacement[] = [];
  let occupied = Array.from({ length: safeRows }, () => Array.from({ length: safeColumns }, () => false));

  items.forEach(item => {
    const columnSpan = item.isFolder ? 2 : 1;
    const rowSpan = 1;
    let position = findOpenPosition(occupied, columnSpan, rowSpan);
    if (!position) {
      pages.push(page);
      page = [];
      occupied = Array.from({ length: safeRows }, () => Array.from({ length: safeColumns }, () => false));
      position = findOpenPosition(occupied, columnSpan, rowSpan);
    }
    if (!position) throw new RangeError(`首页网格无法容纳 ${item.token}`);
    const placement: HomeGridPlacement = {
      ...item,
      column: position.column + 1,
      columnSpan: columnSpan as 1 | 2,
      row: position.row + 1,
      rowSpan: rowSpan as 1 | 2,
    };
    occupyCells(occupied, placement);
    page.push(placement);
  });

  if (page.length || !pages.length) pages.push(page);
  return pages;
}
