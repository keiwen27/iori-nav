const configTableBody = document.getElementById('configTableBody');
const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');
const currentPageSpan = document.getElementById('currentPage');
const totalPagesSpan = document.getElementById('totalPages');

const pendingTableBody = document.getElementById('pendingTableBody');
const pendingPrevPageBtn = document.getElementById('pendingPrevPage');
const pendingNextPageBtn = document.getElementById('pendingNextPage');
const pendingCurrentPageSpan = document.getElementById('pendingCurrentPage');
const pendingTotalPagesSpan = document.getElementById('pendingTotalPages');

const messageDiv = document.getElementById('message');
const categoryTableBody = document.getElementById('categoryTableBody');
const categoryPrevPageBtn = document.getElementById('categoryPrevPage');
const categoryNextPageBtn = document.getElementById('categoryNextPage');
const categoryCurrentPageSpan = document.getElementById('categoryCurrentPage');
const categoryTotalPagesSpan = document.getElementById('categoryTotalPages');
const refreshCategoriesBtn = document.getElementById('refreshCategories');

var escapeHTML = function (value) {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value)
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '\'');
};

var normalizeUrl = function (value) {
  var trimmed = String(value || '').trim();
  var normalized = '';
  if (/^https?:\/\//i.test(trimmed)) {
    normalized = trimmed;
  } else if (/^[\w.-]+\.[\w.-]+/.test(trimmed)) {
    normalized = 'https://' + trimmed;
  }
  return normalized;
};


const importBtn = document.getElementById('importBtn');
const importFile = document.getElementById('importFile');
const exportBtn = document.getElementById('exportBtn');

const tabButtons = document.querySelectorAll('.tab-button');
const tabContents = document.querySelectorAll('.tab-content');

tabButtons.forEach(button => {
  button.addEventListener('click', () => {
    const tab = button.dataset.tab;
    tabButtons.forEach(b => b.classList.remove('active'));
    button.classList.add('active');
    tabContents.forEach(content => {
      content.classList.remove('active');
      if (content.id === tab) {
        content.classList.add('active');
      }
    })
    if (tab === 'categories') {
      fetchCategories();
    }
  });
});

if (refreshCategoriesBtn) {
  refreshCategoriesBtn.addEventListener('click', () => {
    fetchCategories();
  });
}

const searchInput = document.getElementById('searchInput');

let currentPage = 1;
let pageSize = 10;
let totalItems = 0;
let allConfigs = [];
let currentSearchKeyword = '';

let pendingCurrentPage = 1;
let pendingPageSize = 10;
let pendingTotalItems = 0;
let allPendingConfigs = [];

let categoryCurrentPage = 1;
let categoryPageSize = 10;
let categoryTotalItems = 0;
let categoriesData = [];


// ========== 编辑书签功能 ==========
const editBookmarkModal = document.getElementById('editBookmarkModal');
const closeEditBookmarkModal = document.getElementById('closeEditBookmarkModal');
const editBookmarkForm = document.getElementById('editBookmarkForm');
const getLogo = document.getElementById('getLogo');

if (closeEditBookmarkModal) {
  closeEditBookmarkModal.addEventListener('click', () => {
    editBookmarkModal.style.display = 'none';
  });
}


if (editBookmarkForm) {
  editBookmarkForm.addEventListener('submit', function (e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    fetch(`/api/config/${data.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    }).then(res => res.json())
      .then(data => {
        if (data.code === 200) {
          showModalMessage('editBookmarkModal', '修改成功', 'success');
          setTimeout(() => {
            fetchConfigs();
            editBookmarkModal.style.display = 'none';
          }, 1000);
        } else {
          showModalMessage('editBookmarkModal', data.message, 'error');
        }
      }).catch(err => {
        console.error('网络错误:', err);
        showModalMessage('editBookmarkModal', '网络错误', 'error');
      })
  });
}




function fetchConfigs(page = currentPage, keyword = currentSearchKeyword) {
  let url = `/api/config?page=${page}&pageSize=${pageSize}`;
  if (keyword) {
    url = `/api/config?page=${page}&pageSize=${pageSize}&keyword=${keyword}`
  }
  fetch(url)
    .then(res => res.json())
    .then(data => {
      if (data.code === 200) {
        totalItems = data.total;
        currentPage = data.page;
        totalPagesSpan.innerText = Math.ceil(totalItems / pageSize);
        currentPageSpan.innerText = currentPage;
        allConfigs = data.data;
        renderConfig(allConfigs);
        updatePaginationButtons();
      } else {
        showMessage(data.message, 'error');
      }
    }).catch(err => {
      showMessage('网络错误', 'error');
    })
}

function renderConfig(configs) {
  configTableBody.innerHTML = '';
  if (configs.length === 0) {
    configTableBody.innerHTML = '<tr><td colspan="8">没有配置数据</td></tr>';
    return
  }
  configs.forEach(config => {
    const row = document.createElement('tr');
    const safeName = escapeHTML(config.name || '');
    const normalizedUrl = normalizeUrl(config.url);
    const displayUrl = config.url ? escapeHTML(config.url) : '未提供';
    const urlCell = normalizedUrl
      ? `<a href="${escapeHTML(normalizedUrl)}" target="_blank" rel="noopener noreferrer">${escapeHTML(normalizedUrl)}</a>`
      : displayUrl;
    const normalizedLogo = normalizeUrl(config.logo);
    const logoCell = normalizedLogo
      ? `<img src="${escapeHTML(normalizedLogo)}" alt="${safeName}" style="width:30px;" />`
      : 'N/A';
    const descCell = config.desc ? escapeHTML(config.desc) : 'N/A';
    const catelogCell = escapeHTML(config.catelog || '');
    const sortValue = config.sort_order === 9999 || config.sort_order === null || config.sort_order === undefined
      ? '默认'
      : escapeHTML(config.sort_order);
    row.innerHTML = `
      <td>${config.id}</td>
      <td>${safeName}</td>
      <td>${urlCell}</td>
      <td>${logoCell}</td>
      <td>${descCell}</td>
      <td>${catelogCell}</td>
      <td>${sortValue}</td>
      <td class="actions">
        <button class="edit-btn" data-id="${config.id}">编辑</button>
        <button class="del-btn" data-id="${config.id}">删除</button>
      </td>
    `;
    configTableBody.appendChild(row);
  });
  bindActionEvents();
}

function bindActionEvents() {
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      handleEdit(this.dataset.id);
    })
  });

  document.querySelectorAll('.del-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      const id = this.dataset.id;
      handleDelete(id)
    })
  })
}
function fetchCategories(page = categoryCurrentPage) {
  if (!categoryTableBody) {
    return;
  }
  categoryTableBody.innerHTML = '<tr><td colspan="4">加载中...</td></tr>';
  fetch(`/api/categories?page=${page}&pageSize=${categoryPageSize}`)
    .then(res => res.json())
    .then(data => {
      if (data.code === 200) {
        categoryTotalItems = data.total;
        categoryCurrentPage = data.page;
        categoryTotalPagesSpan.innerText = Math.ceil(categoryTotalItems / categoryPageSize);
        categoryCurrentPageSpan.innerText = categoryCurrentPage;
        categoriesData = data.data || [];
        renderCategories(categoriesData);
        updateCategoryPaginationButtons();
      } else {
        showMessage(data.message || '加载分类失败', 'error');
        categoryTableBody.innerHTML = '<tr><td colspan="4">加载失败</td></tr>';
      }
    }).catch(() => {
      showMessage('网络错误', 'error');
      categoryTableBody.innerHTML = '<tr><td colspan="4">加载失败</td></tr>';
    });
}

function renderCategories(categories) {
  if (!categoryTableBody) {
    return;
  }
  categoryTableBody.innerHTML = '';
  if (!categories || categories.length === 0) {
    categoryTableBody.innerHTML = '<tr><td colspan="4">暂无分类数据</td></tr>';
    return;
  }

  categories.forEach(item => {
    const row = document.createElement('tr');

    const idCell = document.createElement('td');
    idCell.textContent = item.id;
    row.appendChild(idCell);

    const nameCell = document.createElement('td');
    nameCell.textContent = item.catelog;
    row.appendChild(nameCell);

    const countCell = document.createElement('td');
    countCell.textContent = item.site_count;
    row.appendChild(countCell);

    const sortCell = document.createElement('td');
    sortCell.textContent = item.sort_order;
    row.appendChild(sortCell);

    const actionCell = document.createElement('td');
    actionCell.className = 'category-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'category-edit-btn';
    editBtn.textContent = '编辑';
    editBtn.setAttribute('data-category-id', item.id);
    actionCell.appendChild(editBtn);

    const delBtn = document.createElement('button');
    delBtn.className = 'category-del-btn';
    delBtn.textContent = '删除';
    delBtn.setAttribute('data-category-id', item.id);
    if (item.site_count > 0) {
      delBtn.disabled = true;
    }
    actionCell.appendChild(delBtn);

    row.appendChild(actionCell);
    categoryTableBody.appendChild(row);
  });

  bindCategoryEvents();
}

function bindCategoryEvents() {
  if (!categoryTableBody) {
    return;
  }

  categoryTableBody.querySelectorAll('.category-edit-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      const categoryId = this.getAttribute('data-category-id');
      const category = categoriesData.find(c => c.id == categoryId);
      if (category) {
        document.getElementById('editCategoryId').value = category.id;
        document.getElementById('editCategoryName').value = category.catelog;
        const sortOrder = category.sort_order;
        document.getElementById('editCategorySortOrder').value = (sortOrder === null || sortOrder === 9999) ? '' : sortOrder;
        document.getElementById('editCategoryModal').style.display = 'block';
      } else {
        showMessage('找不到分类数据', 'error');
      }
    });
  });

  categoryTableBody.querySelectorAll('.category-del-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      if (this.disabled) {
        return;
      }
      const category_id = this.getAttribute('data-category-id');
      if (!category_id) {
        return;
      }
      if (!confirm('确定删除该分类吗？')) {
        return;
      }
      fetch('/api/categories/' + encodeURIComponent(category_id), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reset: true })
      }).then(res => res.json())
        .then(data => {
          if (data.code === 200) {
            showMessage('已删除分类', 'success');
            fetchCategories();
          } else {
            showMessage(data.message || '删除失败', 'error');
          }
        }).catch(() => {
          showMessage('网络错误', 'error');
        });
    });
  });
}

function handleEdit(id) {
  fetch(`/api/config/${id}`, {
    method: 'GET'
  }).then(res => res.json())
    .then(data => {
      if (data.code === 200) {
        const configToEdit = data.data
        if (!configToEdit) {
          showMessage('找不到要编辑的数据', 'error');
          return;
        }
        const editBookmarkCatelogSelect = document.getElementById('editBookmarkCatelog');
        fetchCategoriesForSelect(editBookmarkCatelogSelect).then(() => {
          document.getElementById('editBookmarkId').value = configToEdit.id;
          document.getElementById('editBookmarkName').value = configToEdit.name;
          document.getElementById('editBookmarkUrl').value = configToEdit.url;
          document.getElementById('editBookmarkLogo').value = configToEdit.logo;
          document.getElementById('editBookmarkDesc').value = configToEdit.desc;
          document.getElementById('editBookmarkCatelog').value = configToEdit.catelog_id;
          document.getElementById('editBookmarkSortOrder').value = configToEdit.sort_order;
          editBookmarkModal.style.display = 'block';
        })

      }
    });
}

function handleDelete(id) {
  if (!confirm('确认删除？')) return;
  fetch(`/api/config/${id}`, {
    method: 'DELETE'
  }).then(res => res.json())
    .then(data => {
      if (data.code === 200) {
        showMessage('删除成功', 'success');
        fetchConfigs();
      } else {
        showMessage(data.message, 'error');
      }
    }).catch(err => {
      showMessage('网络错误', 'error');
    })
}

function showModalMessage(modalId, message, type) {
  let containerId = '';
  if (modalId === 'addBookmarkModal') containerId = 'addBookmarkMessage';
  else if (modalId === 'editBookmarkModal') containerId = 'editBookmarkMessage';
  else return; // Unknown modal

  const container = document.getElementById(containerId);
  if (container) {
    container.textContent = message;
    container.className = 'modal-message ' + type;
    container.style.display = 'block';
    
    // Auto hide success/info messages after 3 seconds
    if (type === 'success' || type === 'info') {
      setTimeout(() => {
        container.style.display = 'none';
      }, 3000);
    }
  } else {
    // Fallback to global message
    showMessage(message, type);
  }
}

function showMessage(message, type) {
  messageDiv.innerText = message;
  messageDiv.className = type;
  messageDiv.style.display = 'block';
  setTimeout(() => {
    messageDiv.style.display = 'none';
  }, 3000);
}

function updatePaginationButtons() {
  prevPageBtn.disabled = currentPage === 1;
  nextPageBtn.disabled = currentPage >= Math.ceil(totalItems / pageSize)
}

prevPageBtn.addEventListener('click', () => {
  if (currentPage > 1) {
    fetchConfigs(currentPage - 1);
  }
});

nextPageBtn.addEventListener('click', () => {
  if (currentPage < Math.ceil(totalItems / pageSize)) {
    fetchConfigs(currentPage + 1);
  }
});


importBtn.addEventListener('click', () => {
  importFile.click();
});

importFile.addEventListener('change', function (e) {
  const file = e.target.files[0];
  if (!file) return;

  const fileName = file.name.toLowerCase();
  const reader = new FileReader();

  if (fileName.endsWith('.html') || fileName.endsWith('.htm')) {
    // Chrome 书签 HTML 格式导入
    reader.onload = function(event) {
      try {
        const htmlContent = event.target.result;
        const bookmarks = parseChromeBookmarks(htmlContent);
        
        if (bookmarks.length === 0) {
          showMessage('未在文件中找到有效书签', 'error');
          return;
        }
        
        // 显示预览并确认导入
        showImportPreview(bookmarks);
      } catch (error) {
        showMessage('书签解析失败: ' + error.message, 'error');
      }
    };
    reader.readAsText(file, 'UTF-8');
  } else if (fileName.endsWith('.json')) {
    // 系统导出的 JSON 格式导入
    reader.onload = function(event) {
      try {
        const data = JSON.parse(event.target.result);
        
        // 简单确认后直接导入
        if (confirm('确定要导入这个 JSON 文件中的书签吗？')) {
          performImport(data);
        }
      } catch (error) {
        showMessage('JSON 文件解析失败: ' + error.message, 'error');
      }
    };
    reader.readAsText(file, 'UTF-8');
  } else {
    showMessage('不支持的文件格式。请选择 .html 或 .json 文件。', 'error');
  }
  
  // Reset file input to allow re-selecting the same file
  e.target.value = '';
})

exportBtn.addEventListener('click', () => {
  fetch('/api/config/export')
    .then(res => res.blob())
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'config.json';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }).catch(err => {
      showMessage('网络错误', 'error');
    })
})

// 搜索功能
searchInput.addEventListener('input', () => {
  currentSearchKeyword = searchInput.value.trim();
  currentPage = 1;
  fetchConfigs(currentPage, currentSearchKeyword);
});

// 解析 Chrome 书签 HTML
function parseChromeBookmarks(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const bookmarks = [];
  let currentCategory = '未分类';
  
  function traverseNode(node, category) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      // H3 标签表示文件夹(分类)
      if (node.tagName === 'H3') {
        currentCategory = node.textContent.trim() || '未分类';
        // 跳过 "书签栏"、"其他书签" 等顶层文件夹
        if (currentCategory === '书签栏' || currentCategory === 'Bookmarks Bar' || 
            currentCategory === '其他书签' || currentCategory === 'Other Bookmarks') {
          currentCategory = '未分类';
        }
      }
      
      // A 标签表示书签
      if (node.tagName === 'A') {
        const url = node.getAttribute('HREF') || node.getAttribute('href');
        const name = node.textContent.trim();
        
        if (url && name) {
          bookmarks.push({
            name: name,
            url: url,
            logo: '',
            desc: '',
            catelog: category || currentCategory,
            sort_order: 9999
          });
        }
      }
      
      // DL 标签表示列表容器,递归处理子节点
      if (node.tagName === 'DL') {
        const parent = node.previousElementSibling;
        const folderCategory = (parent && parent.tagName === 'H3') 
          ? parent.textContent.trim() 
          : category;
        
        Array.from(node.children).forEach(child => {
          traverseNode(child, folderCategory);
        });
        return;
      }
    }
    
    // 递归处理子节点
    Array.from(node.children || []).forEach(child => {
      traverseNode(child, category);
    });
  }
  
  traverseNode(doc.body, currentCategory);
  return bookmarks;
}

// 显示导入预览
function showImportPreview(bookmarks) {
  const previewModal = document.createElement('div');
  previewModal.className = 'modal';
  previewModal.style.display = 'block';
  
  // 统计分类信息
  const categoryStats = {};
  bookmarks.forEach(b => {
    categoryStats[b.catelog] = (categoryStats[b.catelog] || 0) + 1;
  });
  
  const categoryList = Object.entries(categoryStats)
    .map(([cat, count]) => `<li>${escapeHTML(cat)}: ${count} 个书签</li>`)
    .join('');
  
  previewModal.innerHTML = `
    <div class="modal-content">
      <span class="modal-close" id="closePreviewModal">×</span>
      <h2>导入预览</h2>
      <div style="margin: 20px 0;">
        <p><strong>总共发现 ${bookmarks.length} 个书签</strong></p>
        <p><strong>包含以下分类:</strong></p>
        <ul style="margin: 10px 0; padding-left: 20px;">
          ${categoryList}
        </ul>
        <p style="margin-top: 15px; color: #6c757d; font-size: 0.9rem;">
          注意: 导入的书签将使用默认排序值 9999
        </p>
      </div>
      <div style="display: flex; gap: 10px; justify-content: flex-end;">
        <button id="cancelImport" style="background-color: #6c757d;">取消</button>
        <button id="confirmImport" style="background-color: #28a745;">确认导入</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(previewModal);
  
  // 关闭预览
  document.getElementById('closePreviewModal').addEventListener('click', () => {
    document.body.removeChild(previewModal);
  });
  
  document.getElementById('cancelImport').addEventListener('click', () => {
    document.body.removeChild(previewModal);
  });
  
  // 确认导入
  document.getElementById('confirmImport').addEventListener('click', () => {
    document.body.removeChild(previewModal);
    performImport(bookmarks);
  });
  
  // 点击遮罩关闭
  previewModal.addEventListener('click', (e) => {
    if (e.target === previewModal) {
      document.body.removeChild(previewModal);
    }
  });
}

// 执行导入
function performImport(dataToImport) {
  showMessage('正在导入,请稍候...', 'success');
  
  fetch('/api/config/import', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(dataToImport)
  }).then(res => res.json())
    .then(data => {
      if (data.code === 201) {
        // The success message from the backend is more accurate now
        showMessage(data.message, 'success');
        fetchConfigs();
      } else {
        showMessage(data.message || '导入失败', 'error');
      }
    }).catch(err => {
      showMessage('网络错误: ' + err.message, 'error');
    });
}

function fetchPendingConfigs(page = pendingCurrentPage) {
  fetch(`/api/pending?page=${page}&pageSize=${pendingPageSize}`)
    .then(res => res.json())
    .then(data => {
      if (data.code === 200) {
        pendingTotalItems = data.total;
        pendingCurrentPage = data.page;
        pendingTotalPagesSpan.innerText = Math.ceil(pendingTotalItems / pendingPageSize);
        pendingCurrentPageSpan.innerText = pendingCurrentPage;
        allPendingConfigs = data.data;
        renderPendingConfig(allPendingConfigs);
        updatePendingPaginationButtons();
      } else {
        showMessage(data.message, 'error');
      }
    }).catch(err => {
      showMessage('网络错误', 'error');
    })
}

function renderPendingConfig(configs) {
  pendingTableBody.innerHTML = '';
  if (configs.length === 0) {
    pendingTableBody.innerHTML = '<tr><td colspan="7">没有待审核数据</td></tr>';
    return
  }
  configs.forEach(config => {
    const row = document.createElement('tr');
    const safeName = escapeHTML(config.name || '');
    const normalizedUrl = normalizeUrl(config.url);
    const urlCell = normalizedUrl
      ? `<a href="${escapeHTML(normalizedUrl)}" target="_blank" rel="noopener noreferrer">${escapeHTML(normalizedUrl)}</a>`
      : (config.url ? escapeHTML(config.url) : '未提供');
    const normalizedLogo = normalizeUrl(config.logo);
    const logoCell = normalizedLogo
      ? `<img src="${escapeHTML(normalizedLogo)}" alt="${safeName}" style="width:30px;" />`
      : 'N/A';
    const descCell = config.desc ? escapeHTML(config.desc) : 'N/A';
    const catelogCell = escapeHTML(config.catelog || '');
    row.innerHTML = `
      <td>${config.id}</td>
      <td>${safeName}</td>
      <td>${urlCell}</td>
      <td>${logoCell}</td>
      <td>${descCell}</td>
      <td>${catelogCell}</td>
      <td class="actions">
        <button class="approve-btn" data-id="${config.id}">批准</button>
        <button class="reject-btn" data-id="${config.id}">拒绝</button>
      </td>
    `;
    pendingTableBody.appendChild(row);
  });
  bindPendingActionEvents();
}

function bindPendingActionEvents() {
  document.querySelectorAll('.approve-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      const id = this.dataset.id;
      handleApprove(id);
    })
  });

  document.querySelectorAll('.reject-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      const id = this.dataset.id;
      handleReject(id);
    })
  })
}

function handleApprove(id) {
  if (!confirm('确定批准吗？')) return;
  fetch(`/api/pending/${id}`, {
    method: 'PUT',
  }).then(res => res.json())
    .then(data => {
      if (data.code === 200) {
        showMessage('批准成功', 'success');
        fetchPendingConfigs();
        fetchConfigs();
      } else {
        showMessage(data.message, 'error')
      }
    }).catch(err => {
      showMessage('网络错误', 'error');
    })
}

function handleReject(id) {
  if (!confirm('确定拒绝吗？')) return;
  fetch(`/api/pending/${id}`, {
    method: 'DELETE'
  }).then(res => res.json())
    .then(data => {
      if (data.code === 200) {
        showMessage('拒绝成功', 'success');
        fetchPendingConfigs();
      } else {
        showMessage(data.message, 'error');
      }
    }).catch(err => {
      showMessage('网络错误', 'error');
    })
}

function updatePendingPaginationButtons() {
  pendingPrevPageBtn.disabled = pendingCurrentPage === 1;
  pendingNextPageBtn.disabled = pendingCurrentPage >= Math.ceil(pendingTotalItems / pendingPageSize)
}

pendingPrevPageBtn.addEventListener('click', () => {
  if (pendingCurrentPage > 1) {
    fetchPendingConfigs(pendingCurrentPage - 1);
  }
});

pendingNextPageBtn.addEventListener('click', () => {
  if (pendingCurrentPage < Math.ceil(pendingTotalItems / pendingPageSize)) {
    fetchPendingConfigs(pendingCurrentPage + 1)
  }
});

function updateCategoryPaginationButtons() {
  categoryPrevPageBtn.disabled = categoryCurrentPage === 1;
  categoryNextPageBtn.disabled = categoryCurrentPage >= Math.ceil(categoryTotalItems / categoryPageSize)
}

categoryPrevPageBtn.addEventListener('click', () => {
  if (categoryCurrentPage > 1) {
    fetchCategories(categoryCurrentPage - 1);
  }
});

categoryNextPageBtn.addEventListener('click', () => {
  if (categoryCurrentPage < Math.ceil(categoryTotalItems / categoryPageSize)) {
    fetchCategories(categoryCurrentPage + 1)
  }
});

// 初始化加载数据
fetchConfigs();
fetchPendingConfigs();
if (categoryTableBody) {
  fetchCategories();
}


// ========== 新增分类功能 ==========
const addCategoryBtn = document.getElementById('addCategoryBtn');
const addCategoryModal = document.getElementById('addCategoryModal');
const closeCategoryModal = document.getElementById('closeCategoryModal');
const addCategoryForm = document.getElementById('addCategoryForm');

if (addCategoryBtn) {
  addCategoryBtn.addEventListener('click', () => {
    addCategoryModal.style.display = 'block';
  });
}

if (closeCategoryModal) {
  closeCategoryModal.addEventListener('click', () => {
    addCategoryModal.style.display = 'none';
    addCategoryForm.reset();
  });
}

// 点击模态框外部关闭
if (addCategoryModal) {
  addCategoryModal.addEventListener('click', (e) => {
    if (e.target === addCategoryModal) {
      addCategoryModal.style.display = 'none';
      addCategoryForm.reset();
    }
  });
}

// ========== 编辑分类功能 ==========
const editCategoryModal = document.getElementById('editCategoryModal');
const closeEditCategoryModal = document.getElementById('closeEditCategoryModal');
const editCategoryForm = document.getElementById('editCategoryForm');

if (closeEditCategoryModal) {
  closeEditCategoryModal.addEventListener('click', () => {
    editCategoryModal.style.display = 'none';
  });
}

if (editCategoryModal) {
  editCategoryModal.addEventListener('click', (e) => {
    if (e.target === editCategoryModal) {
      editCategoryModal.style.display = 'none';
    }
  });
}

if (editCategoryForm) {
  editCategoryForm.addEventListener('submit', function (e) {
    e.preventDefault();

    const id = document.getElementById('editCategoryId').value;
    const categoryName = document.getElementById('editCategoryName').value.trim();
    const sortOrder = document.getElementById('editCategorySortOrder').value.trim();

    if (!categoryName) {
      showMessage('分类名称不能为空', 'error');
      return;
    }

    const isDuplicate = categoriesData.some(category => category.catelog.toLowerCase() === categoryName.toLowerCase() && category.id != id);
    if (isDuplicate) {
      showMessage('该分类名称已存在', 'error');
      return;
    }

    const payload = {
      catelog: categoryName,
    };

    if (sortOrder !== '') {
      payload.sort_order = Number(sortOrder);
    }

    fetch(`/api/categories/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    }).then(res => res.json())
      .then(data => {
        if (data.code === 200) {
          showMessage('分类更新成功', 'success');
          editCategoryModal.style.display = 'none';
          fetchCategories(categoryCurrentPage);
        } else {
          showMessage(data.message || '分类更新失败', 'error');
        }
      }).catch(err => {
        showMessage('网络错误: ' + err.message, 'error');
      });
  });
}

// 提交新增分类表单
if (addCategoryForm) {
  addCategoryForm.addEventListener('submit', function (e) {
    e.preventDefault();

    const categoryName = document.getElementById('newCategoryName').value.trim();
    const sortOrder = document.getElementById('newCategorySortOrder').value.trim();

    if (!categoryName) {
      showMessage('分类名称不能为空', 'error');
      return;
    }

    const payload = {
      catelog: categoryName
    };

    if (sortOrder !== '') {
      payload.sort_order = Number(sortOrder);
    }

    fetch('/api/categories/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    }).then(res => res.json())
      .then(data => {
        if (data.code === 201 || data.code === 200) {
          showMessage('分类创建成功', 'success');
          addCategoryModal.style.display = 'none';
          addCategoryForm.reset();

          // 如果当前在分类排序标签页,刷新数据
          const categoriesTab = document.getElementById('categories');
          if (categoriesTab && categoriesTab.classList.contains('active')) {
            fetchCategories();
          }
        } else {
          showMessage(data.message || '分类创建失败', 'error');
        }
      }).catch(err => {
        showMessage('网络错误: ' + err.message, 'error');
      });
  });
}

// ========== 新增书签功能 ==========
const addBookmarkBtn = document.getElementById('addBookmarkBtn');
const addBookmarkModal = document.getElementById('addBookmarkModal');
const closeBookmarkModal = document.getElementById('closeBookmarkModal');
const addBookmarkForm = document.getElementById('addBookmarkForm');
const addBookmarkCatelogSelect = document.getElementById('addBookmarkCatelog');

async function fetchCategoriesForSelect(selectElement) {
  try {
    const response = await fetch('/api/categories?pageSize=999');
    const data = await response.json();
    if (data.code === 200 && data.data) {
      selectElement.innerHTML = '';
      data.data.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.catelog;
        selectElement.appendChild(option);
      });
    } else {
      showMessage('加载分类列表失败', 'error');
    }
  } catch (error) {
    showMessage('网络错误，无法加载分类', 'error');
  }
}

if (addBookmarkBtn) {
  addBookmarkBtn.addEventListener('click', () => {
    addBookmarkModal.style.display = 'block';
    fetchCategoriesForSelect(addBookmarkCatelogSelect);
  });
}

if (closeBookmarkModal) {
  closeBookmarkModal.addEventListener('click', () => {
    addBookmarkModal.style.display = 'none';
    if (addBookmarkForm) {
      addBookmarkForm.reset();
    }
  });
}

if (addBookmarkModal) {
  addBookmarkModal.addEventListener('click', (e) => {
    if (e.target === addBookmarkModal) {
      addBookmarkModal.style.display = 'none';
      if (addBookmarkForm) {
        addBookmarkForm.reset();
      }
    }
  });
}

if (addBookmarkForm) {
  addBookmarkForm.addEventListener('submit', function (e) {
    e.preventDefault();

    const name = document.getElementById('addBookmarkName').value;
    const url = document.getElementById('addBookmarkUrl').value;
    const logo = document.getElementById('addBookmarkLogo').value;
    const desc = document.getElementById('addBookmarkDesc').value;
    const catelogId = addBookmarkCatelogSelect.value;
    const sortOrder = document.getElementById('addBookmarkSortOrder').value;

    if (!name || !url || !catelogId) {
      showModalMessage('addBookmarkModal', '名称, URL 和分类为必填项', 'error');
      return;
    }

    const payload = {
      name: name.trim(),
      url: url.trim(),
      logo: logo.trim(),
      desc: desc.trim(),
      catelogId: catelogId
    };

    if (sortOrder !== '') {
      payload.sort_order = Number(sortOrder);
    }

    fetch('/api/config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    }).then(res => res.json())
      .then(data => {
        if (data.code === 201) {
          showModalMessage('addBookmarkModal', '添加成功', 'success');
          setTimeout(() => {
             addBookmarkModal.style.display = 'none';
             addBookmarkForm.reset();
             fetchConfigs();
          }, 1000);
        } else {
          showModalMessage('addBookmarkModal', data.message, 'error');
        }
      }).catch(err => {
        showModalMessage('addBookmarkModal', '网络错误', 'error');
      });
  });
}

// ===================================
// 新版 AI 设置模态框逻辑 (Refactored)
// ===================================
document.addEventListener('DOMContentLoaded', () => {
  const aiSettingsBtn = document.getElementById('aiSettingsBtn');
  const aiSettingsModal = document.getElementById('aiSettingsModal');
  if (!aiSettingsBtn || !aiSettingsModal) return;

  // Modal Elements
  const closeBtn = document.getElementById('closeAiSettingsModal');
  const cancelBtn = document.getElementById('cancelAiSettingsBtn');
  const saveBtn = document.getElementById('saveAiSettingsBtn');

  // Provider Elements
  const providerSelector = document.getElementById('providerSelector');
  const baseUrlGroup = document.getElementById('baseUrlGroup');

  // Form Inputs
  const apiKeyInput = document.getElementById('apiKey');
  const baseUrlInput = document.getElementById('baseUrl');
  const modelNameInput = document.getElementById('modelName');

  // Bulk Generation Elements
  const bulkIdleView = document.getElementById('bulkGenerateIdle');
  const bulkProgressView = document.getElementById('bulkGenerateProgress');
  const batchCompleteBtn = document.getElementById('batchCompleteDescBtn');
  const stopBulkBtn = document.getElementById('stopBulkGenerateBtn');
  const progressBar = document.getElementById('progressBar');
  const progressCounter = document.getElementById('progressCounter');

  let currentAIConfig = {
    provider: 'workers-ai',
    apiKey: '',
    baseUrl: '',
    model: '@cf/meta/llama-3-8b-instruct'
  };

  let shouldStopBulkGeneration = false;
  let aiRequestDelay = 1500; // Default value, will be updated from config

  async function fetchPublicConfig() {
    try {
      const response = await fetch('/api/public-config');
      if (!response.ok) {
        console.error('Failed to fetch public config, using default values.');
        return;
      }
      const config = await response.json();
      if (config && typeof config.aiRequestDelay === 'number') {
        aiRequestDelay = config.aiRequestDelay;
        console.log(`AI request delay set to: ${aiRequestDelay}ms`);
      }
    } catch (error) {
      console.error('Error fetching public config:', error);
    }
  }
  fetchPublicConfig();

  // --- Event Listeners ---

  aiSettingsBtn.addEventListener('click', () => {
    loadConfig();
    updateUIFromConfig();
    aiSettingsModal.style.display = 'block';
  });

  const closeModal = () => {
    if (bulkProgressView.style.display !== 'none') {
        if (!confirm('批量生成正在进行中，确定要关闭吗？')) {
            return;
        }
        shouldStopBulkGeneration = true;
    }
    aiSettingsModal.style.display = 'none';
  };
  closeBtn.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);
  aiSettingsModal.addEventListener('click', (e) => {
      if (e.target === aiSettingsModal) {
          closeModal();
      }
  });

  if (providerSelector) {
    providerSelector.addEventListener('change', () => {
      currentAIConfig.provider = providerSelector.value;
      updateUIFromConfig();
    });
  }

  saveBtn.addEventListener('click', () => {
    currentAIConfig.apiKey = apiKeyInput.value.trim();
    currentAIConfig.baseUrl = baseUrlInput.value.trim();
    currentAIConfig.model = modelNameInput.value.trim();
    saveConfig();
    showMessage('AI 设置已保存', 'success');
    closeModal();
  });

  batchCompleteBtn.addEventListener('click', handleBulkGenerate);
  stopBulkBtn.addEventListener('click', () => {
      shouldStopBulkGeneration = true;
      showMessage('正在停止...', 'info');
  });

  // --- Helper Functions ---

  function loadConfig() {
    const savedConfig = localStorage.getItem('ai_settings');
    if (savedConfig) {
      currentAIConfig = JSON.parse(savedConfig);
      // Ensure provider is valid (handle legacy config)
      if (!['gemini', 'openai', 'workers-ai'].includes(currentAIConfig.provider)) {
          currentAIConfig.provider = 'workers-ai';
      }
    }
  }

  function saveConfig() {
    localStorage.setItem('ai_settings', JSON.stringify(currentAIConfig));
  }

  function updateUIFromConfig() {
    if (providerSelector) {
        providerSelector.value = currentAIConfig.provider;
    }

    const provider = currentAIConfig.provider;
    apiKeyInput.value = currentAIConfig.apiKey || '';
    baseUrlInput.value = currentAIConfig.baseUrl || '';

    // Show/Hide Inputs based on Provider
    if (provider === 'workers-ai') {
        apiKeyInput.parentElement.style.display = 'none';
        baseUrlGroup.style.display = 'none';
        modelNameInput.parentElement.style.display = 'none'; // Configured via env var
    } else {
        apiKeyInput.parentElement.style.display = 'block';
        modelNameInput.parentElement.style.display = 'block';

        if (provider === 'gemini') {
            modelNameInput.value = currentAIConfig.model || 'gemini-1.5-flash';
            modelNameInput.placeholder = 'gemini-1.5-flash';
            baseUrlGroup.style.display = 'none';
        } else if (provider === 'openai') {
            modelNameInput.value = currentAIConfig.model || 'gpt-3.5-turbo';
            modelNameInput.placeholder = 'gpt-3.5-turbo';
            baseUrlGroup.style.display = 'block';
        }
    }
  }

  // --- AI Call Logic (Frontend) ---
  async function getAIDescription(aiConfig, bookmark, generateName = false) {
    const { provider, apiKey, baseUrl, model } = aiConfig;
    const { name, url } = bookmark;

    let systemPrompt, userPrompt;
    if (generateName) {
        systemPrompt = "You are a helpful assistant. You must response with valid JSON.";
        userPrompt = `分析链接：'${url}'。请生成一个简短的网站名称（name，不超过10字）和中文简介（description，不超过30字）。请严格只返回 JSON 格式，例如：{"name": "名称", "description": "简介"}。`;
    } else {
        systemPrompt = "You are a helpful assistant that generates concise and accurate descriptions for bookmarks.";
        userPrompt = `为以下书签生成一个简洁的中文描述（不超过30字）。请直接返回描述内容，不要包含"书签名称"、"描述"等前缀，也不要使用"标题: 描述"的格式。书签名称：'${name}'，链接：'${url}'`;
    }

    let responseText = '';

    try {
      if (provider === 'workers-ai') {
          const response = await fetch('/api/ai-chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  messages: [
                      { role: "system", content: systemPrompt },
                      { role: "user", content: userPrompt }
                  ]
              })
          });
          if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`Workers AI error: ${errorText}`);
          }
          const data = await response.json();
          responseText = typeof data.data === 'string' ? data.data : (data.data.response || JSON.stringify(data.data));

      } else if (provider === 'gemini') {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const response = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: userPrompt }] }],
            generationConfig: { temperature: 0.7 },
          }),
        });
        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`Gemini API error (${response.status}): ${errorBody}`);
        }
        const data = await response.json();
        responseText = data.candidates[0].content.parts[0].text.trim();
      } else if (provider === 'openai') {
        const openaiUrl = `${baseUrl}/v1/chat/completions`;
        const response = await fetch(openaiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt }
            ],
            temperature: 0.7,
          
          }),
        });
        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`OpenAI API error (${response.status}): ${errorBody}`);
        }
        const data = await response.json();
        responseText = data.choices[0].message.content.trim();
      } else {
        throw new Error('Unsupported AI provider');
      }

      if (generateName) {
          try {
             const jsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
             return JSON.parse(jsonStr);
          } catch (e) {
             console.warn('JSON parse failed, returning raw text as description', e);
             return { description: responseText, name: '' };
          }
      } else {
          return { description: responseText, name: '' };
      }

    } catch (error) {
      console.error('AI description generation failed:', error);
      throw error;
    }
  }

  // --- Bulk Generation Logic (Refactored) ---
  async function handleBulkGenerate() {
    currentAIConfig.apiKey = apiKeyInput.value.trim();
    currentAIConfig.baseUrl = baseUrlInput.value.trim();
    currentAIConfig.model = modelNameInput.value.trim();

    // Validation
    if (currentAIConfig.provider !== 'workers-ai') {
        if (!currentAIConfig.apiKey || !currentAIConfig.model) {
            showMessage('请先配置 API Key 和模型名称', 'error');
            return;
        }
        if (currentAIConfig.provider === 'openai' && !currentAIConfig.baseUrl) {
            showMessage('使用 OpenAI 兼容模式时，Base URL 是必填项', 'error');
            return;
        }
    }

    showMessage('正在扫描所有书签，请稍候...', 'info');
    let linksToUpdate = [];
    try {
        const response = await fetch('/api/get-empty-desc-sites');
        const result = await response.json();

        if (!response.ok || result.code !== 200) {
            showMessage(result.message || '获取待处理列表失败', 'error');
            return;
        }
        linksToUpdate = result.data;
    } catch (error) {
        showMessage('扫描书签时发生网络错误', 'error');
        return;
    }

    if (linksToUpdate.length === 0) {
      showMessage('太棒了！所有书签都已有描述。', 'success');
      return;
    }

    if (!confirm(`发现 ${linksToUpdate.length} 个链接缺少描述，确定要使用 AI 自动生成吗？`)) {
      return;
    }

    shouldStopBulkGeneration = false;
    bulkIdleView.style.display = 'none';
    bulkProgressView.style.display = 'block';

    let completedCount = 0;
    const total = linksToUpdate.length;
    progressCounter.textContent = `0 / ${total}`;
    progressBar.style.width = '0%';

    for (let i = 0; i < total; i++) {
      if (shouldStopBulkGeneration) {
        break;
      }

      const link = linksToUpdate[i];
      
      try {
        const { description } = await getAIDescription(currentAIConfig, link);
        const updateResponse = await fetch('/api/update-description', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: link.id, url: link.url, logo: link.logo, description: description })
        });

        const result = await updateResponse.json();
        if (result.code === 200) {
          completedCount++;
        } else {
          console.error(`Failed to update description for ${link.name}:`, result.message);
        }
      } catch (error) {
        console.error(`Error processing ${link.name}:`, error);
      }
      
      progressCounter.textContent = `${i + 1} / ${total}`;
      progressBar.style.width = `${((i + 1) / total) * 100}%`;

      if (i < total - 1) {
        console.log('Waiting for next request...:', aiRequestDelay);
        await new Promise(resolve => setTimeout(resolve, aiRequestDelay));
      }
    }

    bulkIdleView.style.display = 'block';
    bulkProgressView.style.display = 'none';

    // 如果是手动停止，等待2秒以确保数据库写入最终一致性
    if (shouldStopBulkGeneration) {
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // 如果有任何书签被更新（或操作被停止），则刷新列表
    if (completedCount > 0 || shouldStopBulkGeneration) {
        fetchConfigs(currentPage);
    }

    // 根据结果显示最终消息
    let message = '';
    let messageType = 'success';
    if (shouldStopBulkGeneration) {
        message = `操作已停止。成功更新 ${completedCount} 个书签。列表已刷新。`;
    } else {
        if (completedCount === total && total > 0) {
            message = `批量生成完成！成功更新了全部 ${total} 个书签。`;
        } else if (completedCount > 0) {
            message = `批量生成完成。成功更新 ${completedCount} / ${total} 个书签。`;
            messageType = 'info';
        } else if (total > 0) {
            message = '批量生成完成，但未能成功更新任何书签。请检查控制台日志。';
            messageType = 'error';
        }
    }
    if (message) {
        showMessage(message, messageType);
    }

    shouldStopBulkGeneration = false;
  }

  // --- Individual AI Generation (Add/Edit) ---
  const addBookmarkAiBtn = document.getElementById('addBookmarkAiBtn');
  const editBookmarkAiBtn = document.getElementById('editBookmarkAiBtn');

  async function handleSingleGenerate(nameInputId, urlInputId, descInputId, btnId, modalId) {
    const name = document.getElementById(nameInputId).value.trim();
    const url = document.getElementById(urlInputId).value.trim();
    const descInput = document.getElementById(descInputId);
    const btn = document.getElementById(btnId);

    if (!url) {
      showModalMessage(modalId, '请先填写 URL', 'error');
      return;
    }

    // Ensure config is loaded
    loadConfig();
    
    // Check if AI is configured (if not workers-ai, need key)
    if (currentAIConfig.provider !== 'workers-ai' && !currentAIConfig.apiKey) {
         showModalMessage(modalId, '请先在 AI 设置中配置 API Key', 'error');
         return;
    }

    // Loading State
    const originalContent = btn.innerHTML;
    btn.innerHTML = '<div class="ai-spinner"></div>';
    btn.disabled = true;

    showModalMessage(modalId, '正在生成描述...', 'info');
    try {
      // Create a temporary object to match the expected structure
      const generateName = !name;
      const bookmark = { name: name || '未命名', url: url };
      const result = await getAIDescription(currentAIConfig, bookmark, generateName);
      
      descInput.value = result.description;
      if (generateName && result.name) {
          document.getElementById(nameInputId).value = result.name;
      }
      showModalMessage(modalId, '生成成功', 'success');
    } catch (error) {
      console.error(error);
      showModalMessage(modalId, '生成失败: ' + error.message, 'error');
    } finally {
        // Restore State
        btn.innerHTML = originalContent;
        btn.disabled = false;
    }
  }

  if (addBookmarkAiBtn) {
    addBookmarkAiBtn.addEventListener('click', () => {
      handleSingleGenerate('addBookmarkName', 'addBookmarkUrl', 'addBookmarkDesc', 'addBookmarkAiBtn', 'addBookmarkModal');
    });
  }

  if (editBookmarkAiBtn) {
    editBookmarkAiBtn.addEventListener('click', () => {
      handleSingleGenerate('editBookmarkName', 'editBookmarkUrl', 'editBookmarkDesc', 'editBookmarkAiBtn', 'editBookmarkModal');
    });
  }
});
