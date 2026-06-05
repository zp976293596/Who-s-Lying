const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 初始题库 - 每种题型2道，共16道
const INITIAL_QUESTIONS = [
  // 言语理解 (verbal)
  {
    type: 'verbal',
    difficulty: 1,
    content: '下列词语中，没有错别字的一组是：',
    options: [
      { label: 'A', text: '锲而不舍' },
      { label: 'B', text: '按步就班' },
      { label: 'C', text: '委屈求全' },
      { label: 'D', text: '破斧沉舟' }
    ],
    correctAnswer: 'A',
    explanation: 'B应为"按部就班"，C应为"委曲求全"，D应为"破釜沉舟"',
    tags: ['词语辨析']
  },
  {
    type: 'verbal',
    difficulty: 2,
    content: '"人生如逆旅，我亦是行人"出自哪位诗人？',
    options: [
      { label: 'A', text: '李白' },
      { label: 'B', text: '苏轼' },
      { label: 'C', text: '杜甫' },
      { label: 'D', text: '辛弃疾' }
    ],
    correctAnswer: 'B',
    explanation: '出自苏轼《临江仙·送钱穆父》',
    tags: ['诗词典故']
  },

  // 数量关系 (quantitative)
  {
    type: 'quantitative',
    difficulty: 1,
    content: '2, 5, 10, 17, 26, ?',
    options: [
      { label: 'A', text: '35' },
      { label: 'B', text: '37' },
      { label: 'C', text: '39' },
      { label: 'D', text: '41' }
    ],
    correctAnswer: 'B',
    explanation: '规律：n²+1，6²+1=37',
    tags: ['数字推理']
  },
  {
    type: 'quantitative',
    difficulty: 2,
    content: '甲、乙两人从相距100公里的两地同时出发相向而行，甲每小时走6公里，乙每小时走4公里，几小时后相遇？',
    options: [
      { label: 'A', text: '8小时' },
      { label: 'B', text: '10小时' },
      { label: 'C', text: '12小时' },
      { label: 'D', text: '15小时' }
    ],
    correctAnswer: 'B',
    explanation: '100÷(6+4)=10小时',
    tags: ['行程问题']
  },

  // 判断推理 (reasoning)
  {
    type: 'reasoning',
    difficulty: 1,
    content: '所有哺乳动物都是恒温动物，鲸鱼是哺乳动物，因此：',
    options: [
      { label: 'A', text: '鲸鱼是恒温动物' },
      { label: 'B', text: '鲸鱼不是恒温动物' },
      { label: 'C', text: '有些鲸鱼是恒温动物' },
      { label: 'D', text: '无法确定' }
    ],
    correctAnswer: 'A',
    explanation: '三段论推理，大前提+小前提=结论',
    tags: ['逻辑推理']
  },
  {
    type: 'reasoning',
    difficulty: 2,
    content: '如果"所有的猫都怕水"为假，那么下列哪项必然为真？',
    options: [
      { label: 'A', text: '所有的猫都不怕水' },
      { label: 'B', text: '有些猫怕水' },
      { label: 'C', text: '有些猫不怕水' },
      { label: 'D', text: '没有猫怕水' }
    ],
    correctAnswer: 'C',
    explanation: '"所有S都是P"为假，则"有些S不是P"为真',
    tags: ['逻辑判断']
  },

  // 资料分析 (data)
  {
    type: 'data',
    difficulty: 1,
    content: '某公司2023年收入100万，2024年收入120万，增长率是多少？',
    options: [
      { label: 'A', text: '15%' },
      { label: 'B', text: '20%' },
      { label: 'C', text: '25%' },
      { label: 'D', text: '30%' }
    ],
    correctAnswer: 'B',
    explanation: '(120-100)÷100=20%',
    tags: ['增长率计算']
  },
  {
    type: 'data',
    difficulty: 2,
    content: '某班50名学生，男生占60%，女生中近视率为40%，则不近视的女生有多少人？',
    options: [
      { label: 'A', text: '12人' },
      { label: 'B', text: '15人' },
      { label: 'C', text: '18人' },
      { label: 'D', text: '20人' }
    ],
    correctAnswer: 'A',
    explanation: '女生50×40%=20人，不近视20×(1-40%)=12人',
    tags: ['比例计算']
  },

  // 常识判断 (knowledge)
  {
    type: 'knowledge',
    difficulty: 1,
    content: '光年是什么单位？',
    options: [
      { label: 'A', text: '时间单位' },
      { label: 'B', text: '长度单位' },
      { label: 'C', text: '速度单位' },
      { label: 'D', text: '质量单位' }
    ],
    correctAnswer: 'B',
    explanation: '光年是光在真空中一年所走的距离，是长度单位',
    tags: ['物理常识']
  },
  {
    type: 'knowledge',
    difficulty: 2,
    content: '下列哪个不是可再生能源？',
    options: [
      { label: 'A', text: '太阳能' },
      { label: 'B', text: '风能' },
      { label: 'C', text: '天然气' },
      { label: 'D', text: '水能' }
    ],
    correctAnswer: 'C',
    explanation: '天然气是化石能源，属于不可再生能源',
    tags: ['能源常识']
  },

  // 情景应变 (scenario)
  {
    type: 'scenario',
    difficulty: 1,
    content: '开会时发现准备的材料有错误，你应该：',
    options: [
      { label: 'A', text: '假装没发现' },
      { label: 'B', text: '立即向领导汇报并提出补救方案' },
      { label: 'C', text: '会后悄悄修改' },
      { label: 'D', text: '责怪同事准备不认真' }
    ],
    correctAnswer: 'B',
    explanation: '职场中发现问题应及时汇报并提出解决方案',
    tags: ['职场应变']
  },
  {
    type: 'scenario',
    difficulty: 2,
    content: '同事在背后说你坏话被你听到了，你应该：',
    options: [
      { label: 'A', text: '当面质问对方' },
      { label: 'B', text: '也去说对方坏话' },
      { label: 'C', text: '反思自己是否有问题，必要时私下沟通' },
      { label: 'D', text: '向领导打小报告' }
    ],
    correctAnswer: 'C',
    explanation: '成熟的做法是先自我反思，再通过沟通解决问题',
    tags: ['人际关系']
  },

  // 组织协调 (organize)
  {
    type: 'organize',
    difficulty: 1,
    content: '组织一次团建活动，首先要做什么？',
    options: [
      { label: 'A', text: '直接订餐厅' },
      { label: 'B', text: '了解大家的时间和偏好' },
      { label: 'C', text: '选择最热门的活动' },
      { label: 'D', text: '让领导决定' }
    ],
    correctAnswer: 'B',
    explanation: '组织活动首先要了解参与者的需求和时间安排',
    tags: ['活动组织']
  },
  {
    type: 'organize',
    difficulty: 2,
    content: '项目进度落后，作为负责人你首先应该：',
    options: [
      { label: 'A', text: '要求团队加班' },
      { label: 'B', text: '分析落后原因，调整计划' },
      { label: 'C', text: '向领导申请延期' },
      { label: 'D', text: '减少项目功能' }
    ],
    correctAnswer: 'B',
    explanation: '首先要找出问题根源，才能制定有效的解决方案',
    tags: ['项目管理']
  },

  // 综合分析 (analyze)
  {
    type: 'analyze',
    difficulty: 1,
    content: '"既要金山银山，也要绿水青山"体现的发展理念是：',
    options: [
      { label: 'A', text: '快速发展' },
      { label: 'B', text: '可持续发展' },
      { label: 'C', text: '优先发展经济' },
      { label: 'D', text: '优先保护环境' }
    ],
    correctAnswer: 'B',
    explanation: '这句话强调经济发展与环境保护并重，体现可持续发展理念',
    tags: ['发展理念']
  },
  {
    type: 'analyze',
    difficulty: 2,
    content: '某市推行"最多跑一次"改革，这属于政府哪方面建设？',
    options: [
      { label: 'A', text: '法治政府' },
      { label: 'B', text: '廉洁政府' },
      { label: 'C', text: '服务型政府' },
      { label: 'D', text: '创新型政府' }
    ],
    correctAnswer: 'C',
    explanation: '"最多跑一次"是提升政务服务效率，建设服务型政府的举措',
    tags: ['行政改革']
  }
]

exports.main = async (event, context) => {
  try {
    // 检查是否已有题目
    const existing = await db.collection('questions').count()
    if (existing.total > 0) {
      return {
        code: 0,
        message: `题库已存在 ${existing.total} 道题，跳过初始化`
      }
    }

    // 批量添加题目
    const promises = INITIAL_QUESTIONS.map(q => {
      return db.collection('questions').add({
        data: {
          ...q,
          tags: q.tags || [],
          createdAt: db.serverDate()
        }
      })
    })

    await Promise.all(promises)

    return {
      code: 0,
      message: `成功导入 ${INITIAL_QUESTIONS.length} 道题`
    }
  } catch (err) {
    console.error('初始化题库失败', err)
    return { code: -1, message: '初始化题库失败', error: err }
  }
}
