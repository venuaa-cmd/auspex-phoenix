// lib/ManagerGovernorLogic.js
export const runGovernorAudit = (previewAllocations, fundManagers, currentAllocations) => {
    // Step 3 & 4: Divide and Check
    const auditResults = fundManagers.map(manager => {
        const managerPortfolio = [];
        
        // Find domains this manager is involved in within the AI preview
        previewAllocations.forEach(domainAlloc => {
            const isAssigned = domainAlloc.manager_assignments.find(ma => ma.id === manager.id);
            
            if (isAssigned) {
                // Step 5 & 6: Check existing funds and utilization
                const currentData = currentAllocations.find(
                    ca => ca.manager_id === manager.id && ca.domain_name === domainAlloc.domain
                );

                const spent = currentData?.spent_amount || 0;
                const allocated = currentData?.allocated_amount || 0;
                const utilization = allocated > 0 ? (spent / allocated) * 100 : 0;

                let action = "MAINTAIN";
                let moraiTrigger = false;

                if (utilization >= 60) {
                    action = "TOP_UP_REQUIRED";
                } else if (allocated > 0) {
                    action = "STAGNANT_FUNDS";
                    moraiTrigger = true;
                }

                managerPortfolio.push({
                    domain: domainAlloc.domain,
                    projected: isAssigned.amount,
                    current_spent: spent,
                    current_allocated: allocated,
                    utilization: utilization,
                    recommendation: action,
                    triggerMorai: moraiTrigger
                });
            }
        });

        return {
            managerId: manager.id,
            managerName: manager.name,
            portfolio: managerPortfolio
        };
    });

    return auditResults;
};