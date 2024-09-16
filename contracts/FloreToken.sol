import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract FloreToken is ERC20, Ownable {

    uint256 private blocksPerMint = 50;
    uint256 public randomSeedCounter;
    uint256 public genesisBlock;
    uint256 public maxTokens;
    uint256 private constant MAX_RANDOM_VALUE = 10;
    mapping(address => uint256) public lastMintBlock;

    constructor() ERC20("FloreToken", "_") {
        genesisBlock = block.number;
        maxTokens = 1000;
    }

    function earn(address recipient_) external {
        uint256 blocksSinceLastMint;
        if (lastMintBlock[recipient_] != 0) blocksSinceLastMint = block.number - lastMintBlock[recipient_];
        else blocksSinceLastMint = block.number - genesisBlock;
        uint256 tokenAmount = blocksSinceLastMint / blocksPerMint;
        uint256 randomValue = uint256(keccak256(abi.encodePacked(block.timestamp, randomSeedCounter))) % MAX_RANDOM_VALUE;
        randomSeedCounter++;
        uint256 totalTokens = tokenAmount + tokenAmount * randomValue;
        if (totalTokens > maxTokens) totalTokens = maxTokens;
        _mint(recipient_, totalTokens);
        lastMintBlock[recipient_] = block.number;
    }

    function updateMaxTokens(uint max_) onlyOwner external {
        maxTokens = max_;
    }

}