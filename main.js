   // Initialize dynamic demand inputs
        document.addEventListener('DOMContentLoaded', function() {
            const periodsInput = document.getElementById('periods');
            const demandInputs = document.getElementById('demandInputs');
            
            // Update demand inputs when period count changes
            periodsInput.addEventListener('input', updateDemandInputs);
            
            // Initialize inputs
            updateDemandInputs();
            
            // Tab switching functionality
            document.getElementById('wagnerTab').addEventListener('click', function() {
                document.getElementById('wagnerResults').classList.remove('hidden');
                document.getElementById('silverResults').classList.add('hidden');
                document.getElementById('compareResults').classList.add('hidden');
                document.getElementById('wagnerTab').classList.add('active-tab');
                document.getElementById('silverTab').classList.remove('active-tab');
                document.getElementById('compareTab').classList.remove('active-tab');
            });
            
            document.getElementById('silverTab').addEventListener('click', function() {
                document.getElementById('wagnerResults').classList.add('hidden');
                document.getElementById('silverResults').classList.remove('hidden');
                document.getElementById('compareResults').classList.add('hidden');
                document.getElementById('wagnerTab').classList.remove('active-tab');
                document.getElementById('silverTab').classList.add('active-tab');
                document.getElementById('compareTab').classList.remove('active-tab');
            });
            
            document.getElementById('compareTab').addEventListener('click', function() {
                document.getElementById('wagnerResults').classList.add('hidden');
                document.getElementById('silverResults').classList.add('hidden');
                document.getElementById('compareResults').classList.remove('hidden');
                document.getElementById('wagnerTab').classList.remove('active-tab');
                document.getElementById('silverTab').classList.remove('active-tab');
                document.getElementById('compareTab').classList.add('active-tab');
            });
            
            // Calculate button functionality
            document.getElementById('calculateBtn').addEventListener('click', calculateInventory);
        });
        
        function updateDemandInputs() {
            const periods = parseInt(document.getElementById('periods').value);
            const demandInputs = document.getElementById('demandInputs');
            
            // Clear existing inputs
            demandInputs.innerHTML = '';
            
            // Add new inputs
            for (let i = 1; i <= periods; i++) {
                const div = document.createElement('div');
                div.className = 'flex items-center';
                
                const label = document.createElement('label');
                label.className = 'w-24 text-gray-700';
                label.textContent = `Periode ${i}:`;
                
                const input = document.createElement('input');
                input.type = 'number';
                input.min = '0';
                input.value = Math.floor(Math.random() * 100) + 20; // Random demand between 20-120
                input.className = 'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500';
                input.id = `demand${i}`;
                
                div.appendChild(label);
                div.appendChild(input);
                demandInputs.appendChild(div);
            }
        }
        
        function calculateInventory() {
            const periods = parseInt(document.getElementById('periods').value);
            const setupCost = parseFloat(document.getElementById('setupCost').value);
            const holdingCost = parseFloat(document.getElementById('holdingCost').value);
            
            // Get demand for each period
            const demands = [];
            for (let i = 1; i <= periods; i++) {
                demands.push(parseFloat(document.getElementById(`demand${i}`).value));
            }
            
            // Calculate Wagner-Within solution
            const wagnerResults = wagnerWithin(demands, setupCost, holdingCost);
            displayWagnerResults(wagnerResults, demands);
            
            // Calculate Silver-Meal solution
            const silverResults = silverMeal(demands, setupCost, holdingCost);
            displaySilverResults(silverResults, demands);
            
            // Compare results
            compareResults(wagnerResults, silverResults);
        }
        
        function wagnerWithin(demands, setupCost, holdingCost) {
            const n = demands.length;
            const totalCost = Array(n).fill(Infinity);
            const orderQuantities = Array(n).fill(0);
            const lastOrderPeriod = Array(n).fill(0);
            
            // Initialize first period
            totalCost[0] = setupCost; // Only setup cost for first period
            orderQuantities[0] = demands[0];
            lastOrderPeriod[0] = 0;
            
            // Dynamic programming solution
            for (let j = 1; j < n; j++) {
                for (let i = 0; i <= j; i++) {
                    let holding = 0;
                    for (let k = i; k < j; k++) {
                        holding += demands[k+1] * (k+1 - i) * holdingCost;
                    }
                    
                    const prevCost = (i === 0) ? 0 : totalCost[i-1];
                    const currentCost = prevCost + setupCost + holding;
                    
                    if (currentCost < totalCost[j]) {
                        totalCost[j] = currentCost;
                        orderQuantities[j] = demands.slice(i, j+1).reduce((a, b) => a + b, 0);
                        lastOrderPeriod[j] = i;
                    }
                }
            }
            
            // Determine order periods and quantities
            const orderSchedule = Array(n).fill(0);
            let j = n - 1;
            while (j >= 0) {
                const i = lastOrderPeriod[j];
                orderSchedule[i] = orderQuantities[j];
                j = i - 1;
            }
            
            return {
                totalCost: totalCost[n-1],
                orderSchedule: orderSchedule,
                holdingCosts: calculateHoldingCosts(orderSchedule, demands, holdingCost)
            };
        }
        
        function silverMeal(demands, setupCost, holdingCost) {
            const n = demands.length;
            const orderSchedule = Array(n).fill(0);
            
            let currentPeriod = 0;
            let totalCost = 0;
            const holdingCosts = Array(n).fill(0);
            
            while (currentPeriod < n) {
                let k = 1;
                let bestK = 1;
                let minAverageCost = Infinity;
                
                while (currentPeriod + k - 1 < n) {
                    let holding = 0;
                    for (let i = 1; i < k; i++) {
                        holding += demands[currentPeriod + i] * i * holdingCost;
                    }
                    
                    const averageCost = (setupCost + holding) / k;
                    
                    if (averageCost < minAverageCost) {
                        minAverageCost = averageCost;
                        bestK = k;
                    } else {
                        break; // Stop when average cost starts increasing
                    }
                    
                    k++;
                }
                
                // Calculate actual holding cost for this order
                let actualHolding = 0;
                for (let i = 1; i < bestK; i++) {
                    holdingCosts[currentPeriod + i] = demands[currentPeriod + i] * i * holdingCost;
                    actualHolding += holdingCosts[currentPeriod + i];
                }
                
                // Record this order
                const orderQuantity = demands.slice(currentPeriod, currentPeriod + bestK).reduce((a, b) => a + b, 0);
                orderSchedule[currentPeriod] = orderQuantity;
                totalCost += setupCost + actualHolding;
                
                currentPeriod += bestK;
            }
            
            return {
                totalCost: totalCost,
                orderSchedule: orderSchedule,
                holdingCosts: holdingCosts
            };
        }
        
        function calculateHoldingCosts(orderSchedule, demands, holdingCost) {
            const n = demands.length;
            const holdingCosts = Array(n).fill(0);
            let inventory = 0;
            
            for (let i = 0; i < n; i++) {
                if (orderSchedule[i] > 0) {
                    inventory = orderSchedule[i];
                }
                
                if (i > 0) {
                    holdingCosts[i] = inventory * holdingCost;
                    inventory -= demands[i];
                }
            }
            
            return holdingCosts;
        }
        
        function displayWagnerResults(results, demands) {
            const periods = demands.length;
            
            // Display table
            const table = document.getElementById('wagnerTable');
            table.innerHTML = `
                <thead>
                    <tr class="bg-blue-50 text-blue-800">
                        <th class="px-4 py-2 text-left">Periode</th>
                        <th class="px-4 py-2 text-left">Permintaan</th>
                        <th class="px-4 py-2 text-left">Pesanan</th>
                        <th class="px-4 py-2 text-left">Persediaan</th>
                        <th class="px-4 py-2 text-left">Biaya Holding</th>
                    </tr>
                </thead>
                <tbody>
                    ${demands.map((demand, i) => `
                        <tr class="border-b border-gray-100 hover:bg-blue-50">
                            <td class="px-4 py-2">${i+1}</td>
                            <td class="px-4 py-2">${demand}</td>
                            <td class="px-4 py-2">${results.orderSchedule[i] > 0 ? results.orderSchedule[i] : ''}</td>
                            <td class="px-4 py-2">${i === 0 ? results.orderSchedule[i] - demand : (results.orderSchedule[i] > 0 ? results.orderSchedule[i] - demand : '')}</td>
                            <td class="px-4 py-2">${results.holdingCosts[i] > 0 ? results.holdingCosts[i].toFixed(2) : ''}</td>
                        </tr>
                    `).join('')}
                    <tr class="bg-blue-100 font-semibold">
                        <td colspan="4" class="px-4 py-2 text-right">Total Biaya:</td>
                        <td class="px-4 py-2">${results.totalCost.toFixed(2)}</td>
                    </tr>
                </tbody>
            `;
            
            // Display summary
            document.getElementById('wagnerSummary').innerHTML = `
                Total biaya persediaan dengan metode Wagner-Within adalah <span class="font-semibold">${results.totalCost.toFixed(2)}</span>.<br>
                Jumlah pemesanan: <span class="font-semibold">${results.orderSchedule.filter(x => x > 0).length}</span> kali.<br>
                Skema pemesanan: ${results.orderSchedule.map((qty, i) => qty > 0 ? `Pesan ${qty} unit pada periode ${i+1}` : '').filter(x => x).join(', ')}.
            `;
            
            // Update chart
            updateChart('wagnerChart', 'Grafik Pemesanan Wagner-Within', demands, results.orderSchedule, results.holdingCosts, 'blue');
        }
        
        function displaySilverResults(results, demands) {
            const periods = demands.length;
            
            // Display table
            const table = document.getElementById('silverTable');
            table.innerHTML = `
                <thead>
                    <tr class="bg-green-50 text-green-800">
                        <th class="px-4 py-2 text-left">Periode</th>
                        <th class="px-4 py-2 text-left">Permintaan</th>
                        <th class="px-4 py-2 text-left">Pesanan</th>
                        <th class="px-4 py-2 text-left">Persediaan</th>
                        <th class="px-4 py-2 text-left">Biaya Inventori</th>
                    </tr>
                </thead>
                <tbody>
                    ${demands.map((demand, i) => `
                        <tr class="border-b border-gray-100 hover:bg-green-50">
                            <td class="px-4 py-2">${i+1}</td>
                            <td class="px-4 py-2">${demand}</td>
                            <td class="px-4 py-2">${results.orderSchedule[i] > 0 ? results.orderSchedule[i] : ''}</td>
                            <td class="px-4 py-2">${i === 0 ? results.orderSchedule[i] - demand : (results.orderSchedule[i] > 0 ? results.orderSchedule[i] - demand : '')}</td>
                            <td class="px-4 py-2">${results.holdingCosts[i] > 0 ? results.holdingCosts[i].toFixed(2) : ''}</td>
                        </tr>
                    `).join('')}
                    <tr class="bg-green-100 font-semibold">
                        <td colspan="4" class="px-4 py-2 text-right">Total Biaya:</td>
                        <td class="px-4 py-2">${results.totalCost.toFixed(2)}</td>
                    </tr>
                </tbody>
            `;
            
            // Display summary
            document.getElementById('silverSummary').innerHTML = `
                Total biaya persediaan dengan metode Silver-Meal adalah <span class="font-semibold">${results.totalCost.toFixed(2)}</span>.<br>
                Jumlah pemesanan: <span class="font-semibold">${results.orderSchedule.filter(x => x > 0).length}</span> kali.<br>
                Skema pemesanan: ${results.orderSchedule.map((qty, i) => qty > 0 ? `Pesan ${qty} unit pada periode ${i+1}` : '').filter(x => x).join(', ')}.
            `;
            
            // Update chart
            updateChart('silverChart', 'Grafik Pemesanan Silver-Meal', demands, results.orderSchedule, results.holdingCosts, 'green');
        }
        
        function compareResults(wagnerResults, silverResults) {
            document.getElementById('wagnerCompare').innerHTML = `
                Total Biaya: <span class="font-semibold">${wagnerResults.totalCost.toFixed(2)}</span><br>
                Jumlah Pemesanan: <span class="font-semibold">${wagnerResults.orderSchedule.filter(x => x > 0).length}</span><br>
                Rata-rata Ukuran Pesanan: <span class="font-semibold">${(wagnerResults.orderSchedule.reduce((a, b) => a + b, 0) / wagnerResults.orderSchedule.filter(x => x > 0).length).toFixed(2)}</span>
            `;
            
            document.getElementById('silverCompare').innerHTML = `
                Total Biaya: <span class="font-semibold">${silverResults.totalCost.toFixed(2)}</span><br>
                Jumlah Pemesanan: <span class="font-semibold">${silverResults.orderSchedule.filter(x => x > 0).length}</span><br>
                Rata-rata Ukuran Pesanan: <span class="font-semibold">${(silverResults.orderSchedule.reduce((a, b) => a + b, 0) / silverResults.orderSchedule.filter(x => x > 0).length).toFixed(2)}</span>
            `;
            
            let conclusion = '';
            if (wagnerResults.totalCost < silverResults.totalCost) {
                conclusion = 'Metode Wagner-Within memberikan biaya total yang lebih rendah dan direkomendasikan untuk scenario ini.';
            } else if (wagnerResults.totalCost > silverResults.totalCost) {
                conclusion = 'Metode Silver-Meal memberikan biaya total yang lebih rendah dan direkomendasikan untuk scenario ini.';
            } else {
                conclusion = 'Kedua metode memberikan biaya total yang sama. Silver-Meal mungkin lebih disukai karena lebih sederhana.';
            }
            
            document.getElementById('conclusion').textContent = conclusion;
            
            // Update comparison charts
            updateComparisonCharts(wagnerResults, silverResults);
        }
        
        function updateChart(canvasId, title, demands, orders, holdingCosts, color) {
            const ctx = document.getElementById(canvasId).getContext('2d');
            
            // Destroy existing chart if it exists
            if (window[`${canvasId}Chart`]) {
                window[`${canvasId}Chart`].destroy();
            }
            
            const labels = demands.map((_, i) => `Periode ${i+1}`);
            
            window[`${canvasId}Chart`] = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Permintaan',
                            data: demands,
                            backgroundColor: `rgba(75, 192, 192, 0.6)`,
                            borderColor: `rgba(75, 192, 192, 1)`,
                            borderWidth: 1
                        },
                        {
                            label: 'Pesanan',
                            data: orders,
                            backgroundColor: `rgba(54, 162, 235, 0.6)`,
                            borderColor: `rgba(54, 162, 235, 1)`,
                            borderWidth: 1,
                            type: 'line',
                            tension: 0.1
                        },
                        {
                            label: 'Biaya Inventori',
                            data: holdingCosts,
                            backgroundColor: `rgba(255, 206, 86, 0.6)`,
                            borderColor: `rgba(255, 206, 86, 1)`,
                            borderWidth: 1,
                            yAxisID: 'y1'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: title
                        },
                        legend: {
                            position: 'top',
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Unit/Quantity'
                            }
                        },
                        y1: {
                            beginAtZero: true,
                            position: 'right',
                            title: {
                                display: true,
                                text: 'Biaya'
                            },
                            grid: {
                                drawOnChartArea: false
                            }
                        }
                    }
                }
            });
        }
        
        function updateComparisonCharts(wagnerResults, silverResults) {
            // Cost comparison chart
            const costCtx = document.getElementById('costChart').getContext('2d');
            
            if (window.costComparisonChart) {
                window.costComparisonChart.destroy();
            }
            
            window.costComparisonChart = new Chart(costCtx, {
                type: 'bar',
                data: {
                    labels: ['Wagner-Within', 'Silver-Meal'],
                    datasets: [{
                        label: 'Total Biaya',
                        data: [wagnerResults.totalCost, silverResults.totalCost],
                        backgroundColor: [
                            'rgba(54, 162, 235, 0.7)',
                            'rgba(75, 192, 192, 0.7)'
                        ],
                        borderColor: [
                            'rgba(54, 162, 235, 1)',
                            'rgba(75, 192, 192, 1)'
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
            
            // Order frequency comparison chart
            const orderCtx = document.getElementById('orderChart').getContext('2d');
            
            if (window.orderComparisonChart) {
                window.orderComparisonChart.destroy();
            }
            
            const wagnerOrders = wagnerResults.orderSchedule.filter(x => x > 0).length;
            const silverOrders = silverResults.orderSchedule.filter(x => x > 0).length;
            
            window.orderComparisonChart = new Chart(orderCtx, {
                type: 'bar',
                data: {
                    labels: ['Wagner-Within', 'Silver-Meal'],
                    datasets: [{
                        label: 'Jumlah Pemesanan',
                        data: [wagnerOrders, silverOrders],
                        backgroundColor: [
                            'rgba(255, 206, 86, 0.7)',
                            'rgba(153, 102, 255, 0.7)'
                        ],
                        borderColor: [
                            'rgba(255, 206, 86, 1)',
                            'rgba(153, 102, 255, 1)'
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            stepSize: 1
                        }
                    }
                }
            });
        }