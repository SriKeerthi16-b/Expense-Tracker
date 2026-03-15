// app.js
class ExpenseManager {
    constructor() {
        this.expenses = JSON.parse(localStorage.getItem('expenses')) || [];
        this.budgets = JSON.parse(localStorage.getItem('budgets')) || [];
        this.editingIndex = null;
        this.filters = {
            category: '',
            dateFrom: '',
            dateTo: ''
        };
        
        this.categoryChart = null;
        this.trendChart = null;
        
        this.initializeCharts();
        this.loadExpenses();
        this.setupEventListeners();
        this.loadBudgets();
        this.populateCategoryFilters();
    }

    initializeCharts() {
        Chart.register(ChartDataLabels);
        
        const chartConfig = {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [
                        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', 
                        '#FF9F40', '#8AC24A', '#607D8B', '#E91E63', '#9C27B0'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return ` ₹${context.parsed.toLocaleString('en-IN')}`;
                            }
                        }
                    },
                    datalabels: {
                        formatter: (value, ctx) => {
                            let sum = ctx.dataset.data.reduce((a, b) => a + b, 0);
                            let percentage = (value * 100 / sum).toFixed(1) + "%";
                            return percentage;
                        },
                        color: '#fff',
                        font: {
                            weight: 'bold'
                        }
                    }
                }
            },
            plugins: [ChartDataLabels]
        };

        this.categoryChart = new Chart(
            document.getElementById('categoryChart'), 
            chartConfig
        );
        
        this.trendChart = new Chart(document.getElementById('monthlyTrend'), {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Monthly Spending',
                    data: [],
                    backgroundColor: '#36A2EB',
                    borderColor: '#2980b9',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '₹' + value.toLocaleString('en-IN');
                            }
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return ' ₹' + context.parsed.y.toLocaleString('en-IN');
                            }
                        }
                    },
                    datalabels: {
                        anchor: 'end',
                        align: 'top',
                        formatter: (value) => '₹' + value.toLocaleString('en-IN'),
                        color: '#36A2EB',
                        font: {
                            weight: 'bold'
                        }
                    }
                }
            },
            plugins: [ChartDataLabels]
        });
    }

    setupEventListeners() {
        // Expense form submission
        document.getElementById('expenseForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleExpenseSubmit();
        });

        // Cancel edit button
        document.getElementById('cancelEditBtn').addEventListener('click', () => {
            this.cancelEdit();
        });

        // Export button
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportData();
        });

        // Import button
        document.getElementById('importBtn').addEventListener('click', () => {
            document.getElementById('importFile').click();
        });

        // File input change
        document.getElementById('importFile').addEventListener('change', (e) => {
            this.importData(e);
        });

        // Add budget button
        document.getElementById('addBudgetBtn').addEventListener('click', () => {
            this.showAddBudgetModal();
        });

        // Apply filters button
        document.getElementById('applyFiltersBtn').addEventListener('click', () => {
            this.applyFilters();
        });

        // Reset filters button
        document.getElementById('resetFiltersBtn').addEventListener('click', () => {
            this.resetFilters();
        });

        // Sort by dropdown
        document.getElementById('sortBy').addEventListener('change', () => {
            this.loadExpenses();
        });

        // Set default date to today
        document.getElementById('date').value = new Date().toISOString().split('T')[0];
    }

    handleExpenseSubmit() {
        const amount = parseFloat(document.getElementById('amount').value);
        const category = document.getElementById('category').value;
        const date = document.getElementById('date').value;
        const description = document.getElementById('description').value;

        if (!amount || amount <= 0) {
            alert('Please enter a valid amount');
            return;
        }

        if (!category) {
            alert('Please select a category');
            return;
        }

        if (!date) {
            alert('Please select a date');
            return;
        }

        const expense = {
            amount,
            category,
            date,
            description
        };

        if (this.editingIndex !== null) {
            this.updateExpense(this.editingIndex, expense);
        } else {
            this.addExpense(expense);
        }
    }

    addExpense(expense) {
        this.expenses.push(expense);
        this.saveToLocalStorage();
        this.loadExpenses();
        this.updateCharts();
        document.getElementById('expenseForm').reset();
    }

    updateExpense(index, updatedExpense) {
        this.expenses[index] = updatedExpense;
        this.saveToLocalStorage();
        this.loadExpenses();
        this.updateCharts();
        this.cancelEdit();
    }

    deleteExpense(index) {
        if (confirm('Are you sure you want to delete this expense?')) {
            this.expenses.splice(index, 1);
            this.saveToLocalStorage();
            this.loadExpenses();
            this.updateCharts();
        }
    }

    editExpense(index) {
        const expense = this.expenses[index];
        document.getElementById('amount').value = expense.amount;
        document.getElementById('category').value = expense.category;
        document.getElementById('date').value = expense.date;
        document.getElementById('description').value = expense.description;
        
        document.getElementById('submitBtn').textContent = 'Update Expense';
        document.getElementById('cancelEditBtn').style.display = 'inline-block';
        
        this.editingIndex = index;
        document.getElementById('amount').focus();
    }

    cancelEdit() {
        document.getElementById('expenseForm').reset();
        document.getElementById('submitBtn').textContent = 'Add Expense';
        document.getElementById('cancelEditBtn').style.display = 'none';
        this.editingIndex = null;
    }

    saveToLocalStorage() {
        localStorage.setItem('expenses', JSON.stringify(this.expenses));
        localStorage.setItem('budgets', JSON.stringify(this.budgets));
    }

    loadExpenses() {
        const expenseTable = document.getElementById('expenseTable');
        expenseTable.innerHTML = '';
        
        // Apply filters
        let filteredExpenses = [...this.expenses];
        
        if (this.filters.category) {
            filteredExpenses = filteredExpenses.filter(
                expense => expense.category === this.filters.category
            );
        }
        
        if (this.filters.dateFrom) {
            filteredExpenses = filteredExpenses.filter(
                expense => new Date(expense.date) >= new Date(this.filters.dateFrom)
            );
        }
        
        if (this.filters.dateTo) {
            filteredExpenses = filteredExpenses.filter(
                expense => new Date(expense.date) <= new Date(this.filters.dateTo)
            );
        }
        
        // Apply sorting
        const sortBy = document.getElementById('sortBy').value;
        filteredExpenses.sort((a, b) => {
            switch (sortBy) {
                case 'date-desc':
                    return new Date(b.date) - new Date(a.date);
                case 'date-asc':
                    return new Date(a.date) - new Date(b.date);
                case 'amount-desc':
                    return b.amount - a.amount;
                case 'amount-asc':
                    return a.amount - b.amount;
                case 'category':
                    return a.category.localeCompare(b.category);
                default:
                    return 0;
            }
        });
        
        if (filteredExpenses.length === 0) {
            const noResults = document.createElement('div');
            noResults.className = 'no-results';
            noResults.textContent = 'No expenses found matching your criteria';
            expenseTable.appendChild(noResults);
            return;
        }
        
        filteredExpenses.forEach((expense, index) => {
            const expenseElement = document.createElement('div');
            expenseElement.className = 'expense-item';
            
            const date = new Date(expense.date);
            const formattedDate = date.toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
            
            expenseElement.innerHTML = `
                <div>${formattedDate}</div>
                <div>${expense.category}</div>
                <div>${expense.description || '-'}</div>
                <div class="expense-amount">₹${expense.amount.toLocaleString('en-IN', { 
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2 
                })}</div>
                <div class="expense-actions">
                    <button class="action-btn" onclick="expenseManager.editExpense(${this.expenses.indexOf(expense)})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn danger" onclick="expenseManager.deleteExpense(${this.expenses.indexOf(expense)})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            expenseTable.appendChild(expenseElement);
        });

        this.updateSummary();
        this.checkBudgets();
    }

    updateSummary() {
        const total = this.expenses.reduce((sum, expense) => sum + expense.amount, 0);
        document.getElementById('totalAmount').textContent = 
            `₹${total.toLocaleString('en-IN', { 
                minimumFractionDigits: 2,
                maximumFractionDigits: 2 
            })}`;
        
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        const monthly = this.expenses
            .filter(expense => {
                const expenseDate = new Date(expense.date);
                return expenseDate.getMonth() === currentMonth && 
                       expenseDate.getFullYear() === currentYear;
            })
            .reduce((sum, expense) => sum + expense.amount, 0);
            
        document.getElementById('monthlyAmount').textContent = 
            `₹${monthly.toLocaleString('en-IN', { 
                minimumFractionDigits: 2,
                maximumFractionDigits: 2 
            })}`;
            
        // Calculate daily average
        const firstExpenseDate = this.expenses.length > 0 ? 
            new Date(Math.min(...this.expenses.map(e => new Date(e.date)))) : 
            new Date();
            
        const daysDiff = Math.ceil(
            (now - firstExpenseDate) / (1000 * 60 * 60 * 24)
        ) || 1;
        
        const dailyAverage = total / daysDiff;
        document.getElementById('dailyAverage').textContent = 
            `₹${dailyAverage.toLocaleString('en-IN', { 
                minimumFractionDigits: 2,
                maximumFractionDigits: 2 
            })}`;
    }

    updateCharts() {
        // Update Category Chart
        const categories = [...new Set(this.expenses.map(expense => expense.category))];
        const categoryData = categories.map(category => 
            this.expenses.filter(expense => expense.category === category)
                .reduce((sum, expense) => sum + expense.amount, 0)
        );

        this.categoryChart.data.labels = categories;
        this.categoryChart.data.datasets[0].data = categoryData;
        this.categoryChart.update();

        // Update Trend Chart
        const now = new Date();
        const currentYear = now.getFullYear();
        
        const months = Array.from({length: 12}, (_, i) => 
            new Date(0, i).toLocaleString('en-US', {month: 'short'}));
            
        const monthlyData = Array(12).fill(0);
        
        this.expenses
            .filter(expense => new Date(expense.date).getFullYear() === currentYear)
            .forEach(expense => {
                const month = new Date(expense.date).getMonth();
                monthlyData[month] += expense.amount;
            });

        this.trendChart.data.labels = months;
        this.trendChart.data.datasets[0].data = monthlyData;
        this.trendChart.update();
    }

    exportData() {
        const data = {
            expenses: this.expenses,
            budgets: this.budgets,
            exportedAt: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `expense-tracker-data-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    importData(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                if (confirm('This will replace your current data. Continue?')) {
                    this.expenses = data.expenses || [];
                    this.budgets = data.budgets || [];
                    this.saveToLocalStorage();
                    this.loadExpenses();
                    this.loadBudgets();
                    this.updateCharts();
                    alert('Data imported successfully!');
                }
            } catch (error) {
                alert('Error importing data: Invalid file format');
                console.error(error);
            }
        };
        reader.readAsText(file);
        event.target.value = ''; // Reset file input
    }

    populateCategoryFilters() {
        const filterCategory = document.getElementById('filterCategory');
        const categories = [...new Set(this.expenses.map(expense => expense.category))];
        
        // Clear existing options except the first one
        while (filterCategory.options.length > 1) {
            filterCategory.remove(1);
        }
        
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            filterCategory.appendChild(option);
        });
    }

    applyFilters() {
        this.filters = {
            category: document.getElementById('filterCategory').value,
            dateFrom: document.getElementById('filterDateFrom').value,
            dateTo: document.getElementById('filterDateTo').value
        };
        
        this.loadExpenses();
    }

    resetFilters() {
        document.getElementById('filterCategory').value = '';
        document.getElementById('filterDateFrom').value = '';
        document.getElementById('filterDateTo').value = '';
        
        this.filters = {
            category: '',
            dateFrom: '',
            dateTo: ''
        };
        
        this.loadExpenses();
    }

    // Budget Methods
    loadBudgets() {
        const budgetList = document.getElementById('budgetList');
        budgetList.innerHTML = '';
        
        if (this.budgets.length === 0) {
            budgetList.innerHTML = '<p>No budgets set. Add a budget to track your spending.</p>';
            return;
        }
        
        this.budgets.forEach((budget, index) => {
            const budgetElement = document.createElement('div');
            budgetElement.className = 'budget-item';
            
            const spent = this.expenses
                .filter(expense => expense.category === budget.category)
                .reduce((sum, expense) => sum + expense.amount, 0);
                
            const percentage = Math.min((spent / budget.amount) * 100, 100);
            const remaining = budget.amount - spent;
            
            budgetElement.innerHTML = `
                <div>
                    <strong>${budget.category}</strong>
                    <div class="budget-progress">
                        <div class="budget-progress-bar" style="width: ${percentage}%"></div>
                    </div>
                </div>
                <div>
                    <span>₹${spent.toLocaleString('en-IN')} of ₹${budget.amount.toLocaleString('en-IN')}</span>
                    <div>${percentage.toFixed(1)}% spent</div>
                </div>
                <div>
                    <button class="action-btn danger" onclick="expenseManager.deleteBudget(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            
            budgetList.appendChild(budgetElement);
        });
    }

    showAddBudgetModal() {
        const category = prompt('Enter category for budget:');
        if (!category) return;
        
        const amount = parseFloat(prompt('Enter budget amount:'));
        if (isNaN(amount)) {
            alert('Please enter a valid number');
            return;
        }
        
        // Check if budget already exists for this category
        if (this.budgets.some(b => b.category === category)) {
            alert('Budget already exists for this category');
            return;
        }
        
        this.addBudget({
            category,
            amount
        });
    }

    addBudget(budget) {
        this.budgets.push(budget);
        this.saveToLocalStorage();
        this.loadBudgets();
        this.populateCategoryFilters();
    }

    deleteBudget(index) {
        if (confirm('Are you sure you want to delete this budget?')) {
            this.budgets.splice(index, 1);
            this.saveToLocalStorage();
            this.loadBudgets();
            this.populateCategoryFilters();
        }
    }

    checkBudgets() {
        this.budgets.forEach(budget => {
            const spent = this.expenses
                .filter(expense => expense.category === budget.category)
                .reduce((sum, expense) => sum + expense.amount, 0);
                
            if (spent >= budget.amount * 0.9) {
                // Budget is 90% or more spent
                console.log(`Warning: Budget for ${budget.category} is ${(spent/budget.amount*100).toFixed(1)}% spent`);
                // You could add visual indicators or notifications here
            }
        });
    }
}

// Initialize the app
const expenseManager = new ExpenseManager();