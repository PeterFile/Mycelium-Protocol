import { expect } from "chai";
import pkg from 'hardhat';
const { ethers } = pkg;

describe("TaskEscrowERC20 Contract", function () {
    // Declare variables that will be used across tests
    let taskEscrowERC20;
    let mockToken;
    let client, agent, anotherAccount;
    const taskAmount = ethers.parseUnits("100", 18); // 100 tokens for testing
    const sampleMetadata = "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG"; // Sample IPFS hash

    // `beforeEach` runs before each test, deploying new contract instances
    // to ensure tests are isolated from each other.
    beforeEach(async function () {
        // Get test accounts from Hardhat's local network
        [client, agent, anotherAccount] = await ethers.getSigners();

        // Deploy a mock ERC20 token for testing
        const MockTokenFactory = await ethers.getContractFactory("MockERC20");
        mockToken = await MockTokenFactory.deploy("Test Token", "TEST", ethers.parseUnits("10000", 18));
        await mockToken.waitForDeployment();

        // Deploy a new instance of the TaskEscrowERC20 contract
        const TaskEscrowERC20Factory = await ethers.getContractFactory("TaskEscrowERC20");
        taskEscrowERC20 = await TaskEscrowERC20Factory.deploy();
        await taskEscrowERC20.waitForDeployment();

        // Give client some tokens and approve the escrow contract
        await mockToken.transfer(client.address, ethers.parseUnits("1000", 18));
        await mockToken.connect(client).approve(await taskEscrowERC20.getAddress(), ethers.parseUnits("1000", 18));
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
                .withArgs(0, client.address, agent.address, await mockToken.getAddress(), taskAmount, sampleMetadata);

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
            expect(clientBalance).to.equal(ethers.parseUnits("9900", 18)); // 10000 - 100 (initial supply was 10000, client got 1000 more)
        });

        it("Should revert if amount is zero", async function () {
            await expect(
                taskEscrowERC20.connect(client).createTask(
                    agent.address, 
                    await mockToken.getAddress(), 
                    0,
                    sampleMetadata
                )
            ).to.be.revertedWith("Amount must be > 0");
        });

        it("Should revert if the agent is the zero address", async function () {
            await expect(
                taskEscrowERC20.connect(client).createTask(
                    ethers.ZeroAddress, 
                    await mockToken.getAddress(), 
                    taskAmount,
                    sampleMetadata
                )
            ).to.be.revertedWith("Agent cannot be zero");
        });

        it("Should revert if the token contract is the zero address", async function () {
            await expect(
                taskEscrowERC20.connect(client).createTask(
                    agent.address, 
                    ethers.ZeroAddress, 
                    taskAmount,
                    sampleMetadata
                )
            ).to.be.revertedWith("Token cannot be zero");
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
            ).to.be.revertedWith("Metadata hash cannot be empty");
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
            ).to.be.revertedWith("Only client");
        });

        it("Should revert if approving a non-created task", async function () {
            // First, approve the task
            await taskEscrowERC20.connect(client).approvePayment(0);
            
            // Then, try to approve it again
            await expect(
                taskEscrowERC20.connect(client).approvePayment(0)
            ).to.be.revertedWith("Not Created");
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
            ).to.be.revertedWith("Only agent");
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
            ).to.be.revertedWith("Not Approved");
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
            ).to.be.revertedWith("Only client");
        });

        it("Should revert if cancelling an approved task", async function () {
            // First, approve the task
            await taskEscrowERC20.connect(client).approvePayment(0);

            // Then, try to cancel it
            await expect(
                taskEscrowERC20.connect(client).cancelTaskAndRefund(0)
            ).to.be.revertedWith("Not Created");
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
});