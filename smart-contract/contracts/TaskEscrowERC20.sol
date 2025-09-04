// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title TaskEscrowERC20
 * @author CWP
 * @notice An ERC20-enabled version of the TaskEscrow contract.
 * It allows locking any ERC20 token for task payments, ideal for stablecoins.
 */
contract TaskEscrowERC20 {
    using SafeERC20 for IERC20;

    uint256 private nextTaskId;
    enum Status { Created, Approved, Paid, Cancelled }

    struct Task {
        uint256 id;
        address client;
        address agent;
        IERC20 token;
        uint256 amount;
        Status status;
        string metadataHash; // IPFS hash or other identifier for task metadata
    }

    mapping(uint256 => Task) public tasks;

    event TaskCreated(uint256 indexed taskId, address indexed client, address indexed agent, address token, uint256 amount, string metadataHash);
    event PaymentApproved(uint256 indexed taskId);
    event PaymentClaimed(uint256 indexed taskId, uint256 amount);
    event TaskCancelled(uint256 indexed taskId);

     /**
     * @notice Creates a new task by pulling approved ERC20 tokens into escrow.
     * @dev IMPORTANT: The client MUST have called `approve()` on the token contract beforehand.
     * @param _agent The address of the agent.
     * @param _tokenContract The address of the ERC20 token to be used.
     * @param _amount The amount of the token to be locked.
     * @param _metadataHash Hash or identifier for task metadata (e.g., IPFS hash, JSON string, etc.)
     * @return taskId The ID of the newly created task.
     */
    function createTask(address _agent, address _tokenContract, uint256 _amount, string calldata _metadataHash) external returns (uint256) {
        require(_amount > 0, "Amount must be > 0");
        require(_agent != address(0), "Agent cannot be zero");
        require(_tokenContract != address(0), "Token cannot be zero");
        require(bytes(_metadataHash).length > 0, "Metadata hash cannot be empty");

        IERC20 token = IERC20(_tokenContract);
        token.safeTransferFrom(msg.sender, address(this), _amount);

        uint256 taskId = nextTaskId;
        tasks[taskId] = Task({
            id: taskId,
            client: msg.sender,
            agent: _agent,
            token: token,
            amount: _amount,
            status: Status.Created,
            metadataHash: _metadataHash
        });

        nextTaskId++;
        emit TaskCreated(taskId, msg.sender, _agent, _tokenContract, _amount, _metadataHash);
        return taskId;
    }

    /**
     * @notice Allows the client to approve the payment for a completed task. (No logic change needed)
     */
    function approvePayment(uint256 _taskId) external {
        Task storage task = tasks[_taskId];
        require(msg.sender == task.client, "Only client");
        require(task.status == Status.Created, "Not Created");

        task.status = Status.Approved;
        emit PaymentApproved(_taskId);
    }

    /**
     * @notice Allows the agent to claim the ERC20 tokens after approval.
     */
    function claimPayment(uint256 _taskId) external {
        Task storage task = tasks[_taskId];
        require(msg.sender == task.agent, "Only agent");
        require(task.status == Status.Approved, "Not Approved");

        uint256 paymentAmount = task.amount;
        task.status = Status.Paid;

        emit PaymentClaimed(_taskId, paymentAmount);
        task.token.safeTransfer(task.agent, paymentAmount);
    }

    /**
     * @notice Allows the client to cancel and get a refund of the locked ERC20 tokens.
     */
    function cancelTaskAndRefund(uint256 _taskId) external {
        Task storage task = tasks[_taskId];
        require(msg.sender == task.client, "Only client");
        require(task.status == Status.Created, "Not Created");

        uint256 refundAmount = task.amount;
        task.status = Status.Cancelled;

        emit TaskCancelled(_taskId);
        task.token.safeTransfer(task.client, refundAmount);
    }

    /**
     * @notice Get task metadata hash for verification by agents
     * @param _taskId The ID of the task
     * @return metadataHash The metadata hash of the task
     */
    function getTaskMetadata(uint256 _taskId) external view returns (string memory) {
        return tasks[_taskId].metadataHash;
    }

    /**
     * @notice Get complete task information including metadata
     * @param _taskId The ID of the task
     * @return task The complete task struct
     */
    function getTaskInfo(uint256 _taskId) external view returns (Task memory) {
        return tasks[_taskId];
    }
}
