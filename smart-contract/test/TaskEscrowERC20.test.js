import { expect } from "chai";
import pkg from 'hardhat';
const { ethers } = pkg;

describe("TaskEscrowERC20 Contract", function () {
    // Declare variables that will be used across tests
    let taskEscrowERC20;
    let mockToken;
    let feeToken; // Fee-on-transfer token for testing
    let client, agent, anotherAccount, owner;
    const taskAmount = ethers.parseUnits("100", 18); // 100 tokens for testing
    const sampleMetadata = "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG"; // Sample IPFS hash

    // `beforeEach` runs before each test, deploying new contract instances
    // to ensure tests are isolated from each other.
    beforeEach(async function () {
        // Get test accounts from Hardhat's local network
        [owner, client, agent, anotherAccount] = await ethers.getSigners();

        // Deploy a mock ERC20 token for testing
        const MockTokenFactory = await ethers.getContractFactory("MockERC20");
        mockToken = await MockTokenFactory.deploy("Test Token", "TEST", ethers.parseUnits("10000", 18));
        await mockToken.waitForDeployment();

        // Deploy a fee-on-transfer token for testing
        const FeeTokenFactory = await ethers.getContractFactory("MockFeeToken");
        feeToken = await FeeTokenFactory.deploy("Fee Token", "FEE", ethers.parseUnits("10000", 18));
        await feeToken.waitForDeployment();

        // Deploy a new instance of the TaskEscrowERC20 contract
        const TaskEscrowERC20Factory = await ethers.getContractFactory("TaskEscrowERC20");
        taskEscrowERC20 = await TaskEscrowERC20Factory.connect(owner).deploy();
        await taskEscrowERC20.waitForDeployment();

        // Give client some tokens and approve the escrow contract
        await mockToken.transfer(client.address, ethers.parseUnits("1000", 18));
        await mockToken.connect(client).approve(await taskEscrowERC20.getAddress(), ethers.parseUnits("1000", 18));
        
        // Give client some fee tokens and approve
        await feeToken.transfer(client.address, ethers.parseUnits("1000", 18));
        await feeToken.connect(client).approve(await taskEscrowERC20.getAddress(), ethers.parseUnits("1000", 18));
    });

    // ========================
    //      Deployment
    // ========================
    describe("Deployment", function () {
        it("Should deploy successfully", async function () {
            expect(await taskEscrowERC20.getAddress()).to.not.be.null;
        });
    });

    // ========================
    //      createTask
    // ========================
    describe("createTask", function () {
        it("Should allow a client to create a task and lock ERC20 tokens with metadata", async function () {
            // Client creates a task, locking 100 tokens
            const tx = await taskEscrowERC20.connect(client).createTask(
                agent.address, 
                await mockToken.getAddress(), 
                taskAmount,
                sampleMetadata
            );
            
            // Check if the TaskCreated event was emitted with correct arguments
            await expect(tx)
                .to.emit(taskEscrowERC20, "TaskCreated")
                .withArgs(0, client.address, agent.address, await mockToken.getAddress(), taskAmount, taskAmount, sampleMetadata);

            // Verify the task details stored in the contract
            const task = await taskEscrowERC20.tasks(0);
            expect(task.id).to.equal(0);
            expect(task.client).to.equal(client.address);
            expect(task.agent).to.equal(agent.address);
            expect(task.token).to.equal(await mockToken.getAddress());
            expect(task.amount).to.equal(taskAmount);
            expect(task.status).to.equal(0); // 0 corresponds to Status.Created
            expect(task.metadataHash).to.equal(sampleMetadata);

            // Check if the contract now holds the locked tokens
            const contractBalance = await mockToken.balanceOf(await taskEscrowERC20.getAddress());
            expect(contractBalance).to.equal(taskAmount);

            // Check if client's balance decreased
            const clientBalance = await mockToken.balanceOf(client.address);
            expect(clientBalance).to.equal(ethers.parseUnits("900", 18)); // 1000 - 100 (client got 1000, used 100)
        });

        it("Should revert if amount is zero", async function () {
            await expect(
                taskEscrowERC20.connect(client).createTask(
                    agent.address, 
                    await mockToken.getAddress(), 
                    0,
                    sampleMetadata
                )
            ).to.be.revertedWith("TaskEscrow: Amount must be greater than zero");
        });

        it("Should revert if the agent is the zero address", async function () {
            await expect(
                taskEscrowERC20.connect(client).createTask(
                    ethers.ZeroAddress, 
                    await mockToken.getAddress(), 
                    taskAmount,
                    sampleMetadata
                )
            ).to.be.revertedWith("TaskEscrow: Agent address cannot be zero");
        });

        it("Should revert if the token contract is the zero address", async function () {
            await expect(
                taskEscrowERC20.connect(client).createTask(
                    agent.address, 
                    ethers.ZeroAddress, 
                    taskAmount,
                    sampleMetadata
                )
            ).to.be.revertedWith("TaskEscrow: Token contract address cannot be zero");
        });

        it("Should revert if client has insufficient token balance", async function () {
            // Create a new client with limited tokens
            const [, , , newClient] = await ethers.getSigners();
            await mockToken.transfer(newClient.address, ethers.parseUnits("50", 18));
            await mockToken.connect(newClient).approve(await taskEscrowERC20.getAddress(), ethers.parseUnits("200", 18));
            
            // Try to create a task with more tokens than newClient has
            await expect(
                taskEscrowERC20.connect(newClient).createTask(
                    agent.address, 
                    await mockToken.getAddress(), 
                    taskAmount, // 100 tokens, but newClient only has 50
                    sampleMetadata
                )
            ).to.be.revertedWithCustomError(mockToken, "ERC20InsufficientBalance");
        });

        it("Should revert if client has not approved enough tokens", async function () {
            // Create another client without sufficient approval
            const [, , , newClient] = await ethers.getSigners();
            await mockToken.transfer(newClient.address, ethers.parseUnits("200", 18));
            // Only approve 50 tokens but try to use 100
            await mockToken.connect(newClient).approve(await taskEscrowERC20.getAddress(), ethers.parseUnits("50", 18));

            await expect(
                taskEscrowERC20.connect(newClient).createTask(
                    agent.address, 
                    await mockToken.getAddress(), 
                    taskAmount,
                    sampleMetadata
                )
            ).to.be.revertedWithCustomError(mockToken, "ERC20InsufficientAllowance");
        });

        it("Should revert if metadata hash is empty", async function () {
            await expect(
                taskEscrowERC20.connect(client).createTask(
                    agent.address, 
                    await mockToken.getAddress(), 
                    taskAmount,
                    ""
                )
            ).to.be.revertedWith("TaskEscrow: Metadata hash cannot be empty");
        });

        it("Should revert if agent is the same as client", async function () {
            await expect(
                taskEscrowERC20.connect(client).createTask(
                    client.address, 
                    await mockToken.getAddress(), 
                    taskAmount,
                    sampleMetadata
                )
            ).to.be.revertedWith("TaskEscrow: Agent cannot be the same as client");
        });

        it("Should handle fee-on-transfer tokens correctly", async function () {
            const requestedAmount = ethers.parseUnits("100", 18);
            const expectedFee = requestedAmount * 5n / 100n; // 5% fee
            const expectedActualAmount = requestedAmount - expectedFee;

            const tx = await taskEscrowERC20.connect(client).createTask(
                agent.address, 
                await feeToken.getAddress(), 
                requestedAmount,
                sampleMetadata
            );

            // Check if the TaskCreated event was emitted with correct amounts
            await expect(tx)
                .to.emit(taskEscrowERC20, "TaskCreated")
                .withArgs(0, client.address, agent.address, await feeToken.getAddress(), requestedAmount, expectedActualAmount, sampleMetadata);

            // Verify the task stores the actual amount received
            const task = await taskEscrowERC20.tasks(0);
            expect(task.amount).to.equal(expectedActualAmount);

            // Check contract balance matches actual amount
            const contractBalance = await feeToken.balanceOf(await taskEscrowERC20.getAddress());
            expect(contractBalance).to.equal(expectedActualAmount);
        });
    });

    // ========================
    //      approvePayment
    // ========================
    describe("approvePayment", function () {
        beforeEach(async function () {
            // Create a task first before each approval test
            await taskEscrowERC20.connect(client).createTask(
                agent.address, 
                await mockToken.getAddress(), 
                taskAmount,
                sampleMetadata
            );
        });

        it("Should allow the client to approve a task", async function () {
            const tx = await taskEscrowERC20.connect(client).approvePayment(0);
            
            await expect(tx)
                .to.emit(taskEscrowERC20, "PaymentApproved")
                .withArgs(0);

            const task = await taskEscrowERC20.tasks(0);
            expect(task.status).to.equal(1); // 1 corresponds to Status.Approved
        });

        it("Should revert if a non-client tries to approve", async function () {
            await expect(
                taskEscrowERC20.connect(anotherAccount).approvePayment(0)
            ).to.be.revertedWith("TaskEscrow: Only client can approve payment");
        });

        it("Should revert if approving a non-created task", async function () {
            // First, approve the task
            await taskEscrowERC20.connect(client).approvePayment(0);
            
            // Then, try to approve it again
            await expect(
                taskEscrowERC20.connect(client).approvePayment(0)
            ).to.be.revertedWith("TaskEscrow: Task is not in Created status");
        });
    });

    // ========================
    //      claimPayment
    // ========================
    describe("claimPayment", function () {
        beforeEach(async function () {
            // Create and approve a task before each claim test
            await taskEscrowERC20.connect(client).createTask(
                agent.address, 
                await mockToken.getAddress(), 
                taskAmount,
                sampleMetadata
            );
            await taskEscrowERC20.connect(client).approvePayment(0);
        });

        it("Should allow the agent to claim the ERC20 tokens", async function () {
            const agentInitialBalance = await mockToken.balanceOf(agent.address);
            
            const tx = await taskEscrowERC20.connect(agent).claimPayment(0);
            
            await expect(tx)
                .to.emit(taskEscrowERC20, "PaymentClaimed")
                .withArgs(0, taskAmount);

            const agentFinalBalance = await mockToken.balanceOf(agent.address);
            expect(agentFinalBalance).to.equal(agentInitialBalance + taskAmount);

            const task = await taskEscrowERC20.tasks(0);
            expect(task.status).to.equal(2); // 2 corresponds to Status.Paid

            // Contract should no longer hold the tokens
            const contractBalance = await mockToken.balanceOf(await taskEscrowERC20.getAddress());
            expect(contractBalance).to.equal(0);
        });

        it("Should revert if a non-agent tries to claim", async function () {
            await expect(
                taskEscrowERC20.connect(anotherAccount).claimPayment(0)
            ).to.be.revertedWith("TaskEscrow: Only agent can claim payment");
        });

        it("Should revert if claiming before approval", async function () {
            // Create a new task that is NOT approved
            await taskEscrowERC20.connect(client).createTask(
                agent.address, 
                await mockToken.getAddress(), 
                taskAmount,
                sampleMetadata
            ); // This will be task ID 1
            
            await expect(
                taskEscrowERC20.connect(agent).claimPayment(1)
            ).to.be.revertedWith("TaskEscrow: Payment is not approved");
        });
    });

    // ========================
    //   cancelTaskAndRefund
    // ========================
    describe("cancelTaskAndRefund", function () {
        beforeEach(async function () {
            // Create a task before each cancellation test
            await taskEscrowERC20.connect(client).createTask(
                agent.address, 
                await mockToken.getAddress(), 
                taskAmount,
                sampleMetadata
            );
        });

        it("Should allow the client to cancel and get a refund", async function () {
            const clientInitialBalance = await mockToken.balanceOf(client.address);
            
            const tx = await taskEscrowERC20.connect(client).cancelTaskAndRefund(0);
            
            await expect(tx)
                .to.emit(taskEscrowERC20, "TaskCancelled")
                .withArgs(0);

            const clientFinalBalance = await mockToken.balanceOf(client.address);
            expect(clientFinalBalance).to.equal(clientInitialBalance + taskAmount);

            const task = await taskEscrowERC20.tasks(0);
            expect(task.status).to.equal(3); // 3 corresponds to Status.Cancelled

            // Contract should no longer hold the tokens
            const contractBalance = await mockToken.balanceOf(await taskEscrowERC20.getAddress());
            expect(contractBalance).to.equal(0);
        });

        it("Should revert if a non-client tries to cancel", async function () {
            await expect(
                taskEscrowERC20.connect(anotherAccount).cancelTaskAndRefund(0)
            ).to.be.revertedWith("TaskEscrow: Only client can cancel task");
        });

        it("Should revert if cancelling an approved task", async function () {
            // First, approve the task
            await taskEscrowERC20.connect(client).approvePayment(0);

            // Then, try to cancel it
            await expect(
                taskEscrowERC20.connect(client).cancelTaskAndRefund(0)
            ).to.be.revertedWith("TaskEscrow: Can only cancel tasks in Created status");
        });
    });

    // ========================
    //   Metadata Functions
    // ========================
    describe("Metadata Functions", function () {
        beforeEach(async function () {
            // Create a task with metadata
            await taskEscrowERC20.connect(client).createTask(
                agent.address, 
                await mockToken.getAddress(), 
                taskAmount,
                sampleMetadata
            );
        });

        it("Should return correct task metadata", async function () {
            const metadata = await taskEscrowERC20.getTaskMetadata(0);
            expect(metadata).to.equal(sampleMetadata);
        });

        it("Should return complete task info including metadata", async function () {
            const taskInfo = await taskEscrowERC20.getTaskInfo(0);
            expect(taskInfo.id).to.equal(0);
            expect(taskInfo.client).to.equal(client.address);
            expect(taskInfo.agent).to.equal(agent.address);
            expect(taskInfo.token).to.equal(await mockToken.getAddress());
            expect(taskInfo.amount).to.equal(taskAmount);
            expect(taskInfo.status).to.equal(0); // Status.Created
            expect(taskInfo.metadataHash).to.equal(sampleMetadata);
        });
    });

    // ========================
    //   Multiple Tasks
    // ========================
    describe("Multiple Tasks", function () {
        it("Should handle multiple tasks correctly", async function () {
            // Create multiple tasks
            await taskEscrowERC20.connect(client).createTask(
                agent.address, 
                await mockToken.getAddress(), 
                ethers.parseUnits("50", 18),
                sampleMetadata
            );
            await taskEscrowERC20.connect(client).createTask(
                anotherAccount.address, 
                await mockToken.getAddress(), 
                ethers.parseUnits("75", 18),
                "QmSecondTaskMetadata123456789"
            );

            // Check task IDs are incremented correctly
            const task0 = await taskEscrowERC20.tasks(0);
            const task1 = await taskEscrowERC20.tasks(1);
            
            expect(task0.id).to.equal(0);
            expect(task1.id).to.equal(1);
            expect(task0.agent).to.equal(agent.address);
            expect(task1.agent).to.equal(anotherAccount.address);
            expect(task0.amount).to.equal(ethers.parseUnits("50", 18));
            expect(task1.amount).to.equal(ethers.parseUnits("75", 18));
            expect(task0.metadataHash).to.equal(sampleMetadata);
            expect(task1.metadataHash).to.equal("QmSecondTaskMetadata123456789");

            // Contract should hold total of both amounts
            const contractBalance = await mockToken.balanceOf(await taskEscrowERC20.getAddress());
            expect(contractBalance).to.equal(ethers.parseUnits("125", 18));
        });
    });

    // ========================
    //   Boundary Checks
    // ========================
    describe("Boundary Checks", function () {
        it("Should revert when accessing non-existent task", async function () {
            await expect(
                taskEscrowERC20.getTaskMetadata(999)
            ).to.be.revertedWith("TaskEscrow: Task does not exist");

            await expect(
                taskEscrowERC20.getTaskInfo(999)
            ).to.be.revertedWith("TaskEscrow: Task does not exist");

            await expect(
                taskEscrowERC20.connect(client).approvePayment(999)
            ).to.be.revertedWith("TaskEscrow: Task does not exist");

            await expect(
                taskEscrowERC20.connect(agent).claimPayment(999)
            ).to.be.revertedWith("TaskEscrow: Task does not exist");

            await expect(
                taskEscrowERC20.connect(client).cancelTaskAndRefund(999)
            ).to.be.revertedWith("TaskEscrow: Task does not exist");
        });

        it("Should return correct task existence status", async function () {
            expect(await taskEscrowERC20.taskExists(0)).to.be.false;
            
            await taskEscrowERC20.connect(client).createTask(
                agent.address, 
                await mockToken.getAddress(), 
                taskAmount,
                sampleMetadata
            );
            
            expect(await taskEscrowERC20.taskExists(0)).to.be.true;
            expect(await taskEscrowERC20.taskExists(1)).to.be.false;
        });

        it("Should return correct task count", async function () {
            expect(await taskEscrowERC20.getTaskCount()).to.equal(0);
            
            await taskEscrowERC20.connect(client).createTask(
                agent.address, 
                await mockToken.getAddress(), 
                taskAmount,
                sampleMetadata
            );
            
            expect(await taskEscrowERC20.getTaskCount()).to.equal(1);
        });
    });

    // ========================
    //   Pausable Functionality
    // ========================
    describe("Pausable Functionality", function () {
        it("Should allow owner to pause and unpause", async function () {
            // Only owner can pause
            await expect(
                taskEscrowERC20.connect(client).pause()
            ).to.be.revertedWithCustomError(taskEscrowERC20, "OwnableUnauthorizedAccount");

            // Owner can pause
            await taskEscrowERC20.connect(owner).pause();

            // Functions should be paused
            await expect(
                taskEscrowERC20.connect(client).createTask(
                    agent.address, 
                    await mockToken.getAddress(), 
                    taskAmount,
                    sampleMetadata
                )
            ).to.be.revertedWithCustomError(taskEscrowERC20, "EnforcedPause");

            // Owner can unpause
            await taskEscrowERC20.connect(owner).unpause();

            // Functions should work again
            await expect(
                taskEscrowERC20.connect(client).createTask(
                    agent.address, 
                    await mockToken.getAddress(), 
                    taskAmount,
                    sampleMetadata
                )
            ).to.not.be.reverted;
        });

        it("Should pause all critical functions", async function () {
            // Create a task first
            await taskEscrowERC20.connect(client).createTask(
                agent.address, 
                await mockToken.getAddress(), 
                taskAmount,
                sampleMetadata
            );

            // Pause the contract
            await taskEscrowERC20.connect(owner).pause();

            // All critical functions should be paused
            await expect(
                taskEscrowERC20.connect(client).createTask(
                    agent.address, 
                    await mockToken.getAddress(), 
                    taskAmount,
                    sampleMetadata
                )
            ).to.be.revertedWithCustomError(taskEscrowERC20, "EnforcedPause");

            await expect(
                taskEscrowERC20.connect(client).approvePayment(0)
            ).to.be.revertedWithCustomError(taskEscrowERC20, "EnforcedPause");

            await expect(
                taskEscrowERC20.connect(agent).claimPayment(0)
            ).to.be.revertedWithCustomError(taskEscrowERC20, "EnforcedPause");

            await expect(
                taskEscrowERC20.connect(client).cancelTaskAndRefund(0)
            ).to.be.revertedWithCustomError(taskEscrowERC20, "EnforcedPause");
        });
    });

    // ========================
    //   Emergency Functions
    // ========================
    describe("Emergency Functions", function () {
        it("Should allow owner to recover tokens in emergency", async function () {
            // Send some tokens directly to the contract (simulating stuck tokens)
            await mockToken.transfer(await taskEscrowERC20.getAddress(), ethers.parseUnits("50", 18));

            const ownerBalanceBefore = await mockToken.balanceOf(owner.address);
            
            // Only owner can recover
            await expect(
                taskEscrowERC20.connect(client).emergencyRecoverToken(await mockToken.getAddress(), ethers.parseUnits("50", 18))
            ).to.be.revertedWithCustomError(taskEscrowERC20, "OwnableUnauthorizedAccount");

            // Owner can recover
            await taskEscrowERC20.connect(owner).emergencyRecoverToken(await mockToken.getAddress(), ethers.parseUnits("50", 18));

            const ownerBalanceAfter = await mockToken.balanceOf(owner.address);
            expect(ownerBalanceAfter).to.equal(ownerBalanceBefore + ethers.parseUnits("50", 18));
        });

        it("Should revert emergency recovery with zero address", async function () {
            await expect(
                taskEscrowERC20.connect(owner).emergencyRecoverToken(ethers.ZeroAddress, ethers.parseUnits("50", 18))
            ).to.be.revertedWith("TaskEscrow: Token address cannot be zero");
        });
    });
});