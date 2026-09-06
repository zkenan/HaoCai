/**
 * Excel 模板生成工具
 *
 * 用于生成入库管理页"下载模板"接口的 Excel 文件，包含：
 *   - Sheet "耗材导入模板"：主表（含归属、分类数据验证下拉）
 *   - Sheet "分类清单"：所有分类明细（大类+小类），辅助查阅
 *   - Sheet "归属清单"：所有归属（含补货建议开关），辅助查阅
 *   - Sheet "_Lists"（隐藏）：下拉数据源（解决 Excel list formula 长度限制）
 *
 * 下拉通过 Excel "命名范围 + 数据验证" 实现：
 *   - OwnershipList（_Lists!A2:A{n}）→ 归属列下拉
 *   - CategoryList（_Lists!B2:B{n}）→ 分类列下拉
 *
 * 设计原因：Excel 数据验证 list 类型的单条字符串上限约 8192 字符，归属/分类数量大时不够。
 *           改用命名范围 + 隐藏 sheet，可支持任意数量下拉项。
 */

const ExcelJS = require('exceljs')

/**
 * 构建入库 Excel 导入模板（workbook 对象）
 * @param {Array} categories  分类扁平列表 [{id, name, parent_id, sort}]
 * @param {Array} ownerships 归属扁平列表 [{id, name, sort, need_replenish}]
 * @returns {ExcelJS.Workbook}
 */
function buildStockInTemplate(categories, ownerships) {
  // 注：当前 categories/ownership_options 表未启用软删字段
  const cats = categories
    .sort((a, b) => (a.sort - b.sort) || (a.id - b.id))
  const owns = ownerships
    .sort((a, b) => (a.sort - b.sort) || (a.id - b.id))

  // 大类(parent_id=0) 与 小类分组
  const bigs = cats.filter(c => c.parent_id === 0)
  const smallsByParent = {}
  cats.filter(c => c.parent_id !== 0).forEach(c => {
    if (!smallsByParent[c.parent_id]) smallsByParent[c.parent_id] = []
    smallsByParent[c.parent_id].push(c)
  })

  // 分类下拉数据："大类/小类" 完整路径
  const categoryPaths = []
  bigs.forEach(b => {
    const subs = smallsByParent[b.id] || []
    subs.forEach(s => categoryPaths.push(`${b.name}/${s.name}`))
  })

  // 归属下拉数据
  const ownershipNames = owns.map(o => o.name)

  // ========== 工作簿 ==========
  const workbook = new ExcelJS.Workbook()
  workbook.creator = '耗材管理系统'
  workbook.created = new Date()

  // =================== Sheet: 耗材导入模板 ===================
  const sheet = workbook.addWorksheet('耗材导入模板', {
    views: [{ state: 'frozen', ySplit: 1 }]
  })
  sheet.columns = [
    { header: '名称*',    key: 'name',      width: 18 },
    { header: '规格型号', key: 'spec',      width: 20 },
    { header: '数量*',    key: 'quantity',  width: 10 },
    { header: '单位',     key: 'unit',      width: 10 },
    { header: '单价',     key: 'price',     width: 12 },
    { header: '提报人',   key: 'reporter',  width: 12 },
    { header: '归属*',    key: 'ownership', width: 14 },
    { header: '分类*',    key: 'category',  width: 22 }
  ]

  // 表头样式
  const headerRow = sheet.getRow(1)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 }
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } }
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
  headerRow.height = 26

  // * 必填列高亮表头颜色（已在上面统一蓝色，可不再单独标）

  // 数据验证下拉（行 2-200 共 199 行可用；超出后用户复制模板即可延续下拉）
  const DATA_START = 2
  const DATA_END = 200
  for (let r = DATA_START; r <= DATA_END; r++) {
    // 归属列：G
    sheet.getCell(`G${r}`).dataValidation = {
      type: 'list',
      allowBlank: false,
      formulae: ['OwnershipList'],
      showErrorMessage: true,
      errorStyle: 'error',
      errorTitle: '归属无效',
      error: '请从下拉列表中选择归属'
    }
    sheet.getCell(`G${r}`).alignment = { vertical: 'middle' }

    // 分类列：H（用路径"大类/小类"）
    sheet.getCell(`H${r}`).dataValidation = {
      type: 'list',
      allowBlank: false,
      formulae: ['CategoryList'],
      showErrorMessage: true,
      errorStyle: 'error',
      errorTitle: '分类无效',
      error: '请从下拉列表中选择分类（格式：大类/小类）'
    }
    sheet.getCell(`H${r}`).alignment = { vertical: 'middle' }

    // 必填字段加浅色底（仅视觉提示，不影响数据验证）
    if (r === DATA_START) {
      sheet.getCell(`A${r}`).note = '必填：耗材名称'
      sheet.getCell(`C${r}`).note = '必填：入库数量（整数）'
    }
  }

  // 添加 1 行示例（黄色背景提示），用户可手动删除
  const exampleRow = sheet.getRow(2)
  exampleRow.values = ['A4纸', '70g 500张/包', 10, '包', 22.5, '张老师', ownershipNames[0] || '', categoryPaths[0] || '']
  exampleRow.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF9C3' } }
    cell.font = { italic: true, color: { argb: 'FF6B7280' } }
  })
  exampleRow.getCell(1).note = '示例行，请删除后填入真实数据'

  // =================== Sheet: 分类清单 ===================
  const catSheet = workbook.addWorksheet('分类清单', {
    views: [{ state: 'frozen', ySplit: 1 }]
  })
  catSheet.columns = [
    { header: 'ID',       key: 'id',     width: 8 },
    { header: '分类名称', key: 'name',   width: 24 },
    { header: '层级',     key: 'level',  width: 10 },
    { header: '父分类',   key: 'parent', width: 24 },
    { header: '排序',     key: 'sort',   width: 8 }
  ]
  const catHeader = catSheet.getRow(1)
  catHeader.font = { bold: true }
  catHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E7FF' } }
  catHeader.alignment = { vertical: 'middle', horizontal: 'center' }

  bigs.forEach(b => {
    catSheet.addRow({ id: b.id, name: b.name, level: '大类', parent: '—', sort: b.sort })
    const subs = smallsByParent[b.id] || []
    subs.forEach(s => {
      catSheet.addRow({ id: s.id, name: s.name, level: '小类', parent: b.name, sort: s.sort })
    })
    catSheet.addRow({}) // 空行分组
  })

  // =================== Sheet: 归属清单 ===================
  const ownSheet = workbook.addWorksheet('归属清单', {
    views: [{ state: 'frozen', ySplit: 1 }]
  })
  ownSheet.columns = [
    { header: 'ID',              key: 'id',   width: 8 },
    { header: '归属名称',         key: 'name', width: 18 },
    { header: '排序',             key: 'sort', width: 8 },
    { header: '参与补货建议',     key: 'need', width: 16 }
  ]
  const ownHeader = ownSheet.getRow(1)
  ownHeader.font = { bold: true }
  ownHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } }
  ownHeader.alignment = { vertical: 'middle', horizontal: 'center' }
  owns.forEach(o => {
    ownSheet.addRow({
      id: o.id,
      name: o.name,
      sort: o.sort,
      need: o.need_replenish ? '是' : '否'
    })
  })

  // =================== Sheet: _Lists（隐藏下拉源） ===================
  // 必须放在最后创建，命名范围才能正确引用
  const listSheet = workbook.addWorksheet('_Lists', { state: 'hidden' })
  listSheet.getCell('A1').value = 'ownership'
  ownershipNames.forEach((n, i) => { listSheet.getCell(`A${i + 2}`).value = n })
  listSheet.getCell('B1').value = 'category'
  categoryPaths.forEach((n, i) => { listSheet.getCell(`B${i + 2}`).value = n })

  // 定义命名范围（Excel 数据验证引用）
  // 注意：definedNames.add 的参数顺序在 4.x 是 (range, name)
  if (ownershipNames.length > 0) {
    workbook.definedNames.add(
      `_Lists!$A$2:$A$${ownershipNames.length + 1}`,
      'OwnershipList'
    )
  }
  if (categoryPaths.length > 0) {
    workbook.definedNames.add(
      `_Lists!$B$2:$B$${categoryPaths.length + 1}`,
      'CategoryList'
    )
  }

  return workbook
}

module.exports = { buildStockInTemplate }